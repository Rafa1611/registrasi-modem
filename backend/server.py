from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import jwt
import asyncio
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'olt_registration')]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'olt-huawei-secret-key-2024')
JWT_ALGORITHM = 'HS256'

# Create the main app
app = FastAPI(title="OLT Huawei Registration System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================
# HELPERS
# ============================================================

def serialize_doc(doc):
    """Convert MongoDB document to JSON-safe dict."""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == '_id':
            result['id'] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else str(v) if isinstance(v, (ObjectId, datetime)) else v for v in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    try:
        token = authorization.replace('Bearer ', '')
        return verify_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================================
# MODELS
# ============================================================

class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str = ''

class UserLogin(BaseModel):
    username: str
    password: str

class OLTCreate(BaseModel):
    name: str
    ip_address: str
    port: int = 23
    username: str
    password: str
    description: str = ''
    olt_version: str = 'MA5600V800R018C00'

class OLTUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    description: Optional[str] = None
    olt_version: Optional[str] = None

class ProfileCreate(BaseModel):
    name: str
    olt_id: str
    description: str = ''
    pon_type: str = 'gpon'
    device_type: str = 'hgu'
    line_profile_id: int
    srv_profile_id: int
    register_method: str = 'sn'
    business_vlans: str = ''
    gemport: int = 1
    user_vlan: Optional[int] = None
    priority: int = 0

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    olt_id: Optional[str] = None
    description: Optional[str] = None
    pon_type: Optional[str] = None
    device_type: Optional[str] = None
    line_profile_id: Optional[int] = None
    srv_profile_id: Optional[int] = None
    register_method: Optional[str] = None
    business_vlans: Optional[str] = None
    gemport: Optional[int] = None
    user_vlan: Optional[int] = None
    priority: Optional[int] = None

class RegisterRequest(BaseModel):
    olt_id: str
    profile_id: str
    ont_entries: List[Dict[str, Any]]  # [{sn, fsp, description, ...}]

class DiscoveryRequest(BaseModel):
    olt_id: str

# ============================================================
# AUTH ENDPOINTS
# ============================================================

@api_router.post("/auth/register")
async def register_user(data: UserRegister):
    existing = await db.users.find_one({'username': data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    
    user_doc = {
        'username': data.username,
        'password_hash': hash_password(data.password),
        'full_name': data.full_name,
        'role': 'operator',
        'created_at': datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_doc['_id'] = result.inserted_id
    
    token = create_token(str(result.inserted_id), data.username, 'operator')
    return {'token': token, 'user': serialize_doc(user_doc)}

@api_router.post("/auth/login")
async def login_user(data: UserLogin):
    user = await db.users.find_one({'username': data.username})
    if not user or user['password_hash'] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    
    token = create_token(str(user['_id']), user['username'], user.get('role', 'operator'))
    return {'token': token, 'user': serialize_doc(user)}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    db_user = await db.users.find_one({'username': user['username']})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(db_user)

# ============================================================
# OLT ENDPOINTS
# ============================================================

@api_router.get("/olts")
async def list_olts(user=Depends(get_current_user)):
    olts = await db.olts.find().to_list(100)
    result = []
    for olt in olts:
        s = serialize_doc(olt)
        # Mask password
        s['password'] = '****' if s.get('password') else ''
        result.append(s)
    return result

@api_router.post("/olts")
async def create_olt(data: OLTCreate, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc['created_at'] = datetime.now(timezone.utc)
    doc['created_by'] = user['username']
    doc['status'] = 'unknown'
    result = await db.olts.insert_one(doc)
    doc['_id'] = result.inserted_id
    return serialize_doc(doc)

@api_router.get("/olts/{olt_id}")
async def get_olt(olt_id: str, user=Depends(get_current_user)):
    olt = await db.olts.find_one({'_id': ObjectId(olt_id)})
    if not olt:
        raise HTTPException(status_code=404, detail="OLT tidak ditemukan")
    s = serialize_doc(olt)
    s['password'] = '****'
    return s

@api_router.put("/olts/{olt_id}")
async def update_olt(olt_id: str, data: OLTUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data['updated_at'] = datetime.now(timezone.utc)
    await db.olts.update_one({'_id': ObjectId(olt_id)}, {'$set': update_data})
    olt = await db.olts.find_one({'_id': ObjectId(olt_id)})
    s = serialize_doc(olt)
    s['password'] = '****'
    return s

@api_router.delete("/olts/{olt_id}")
async def delete_olt(olt_id: str, user=Depends(get_current_user)):
    result = await db.olts.delete_one({'_id': ObjectId(olt_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="OLT tidak ditemukan")
    return {'message': 'OLT berhasil dihapus'}

@api_router.post("/olts/{olt_id}/test")
async def test_olt_connection(olt_id: str, user=Depends(get_current_user)):
    olt = await db.olts.find_one({'_id': ObjectId(olt_id)})
    if not olt:
        raise HTTPException(status_code=404, detail="OLT tidak ditemukan")
    
    from olt_telnet import HuaweiOLTConnection
    conn = HuaweiOLTConnection(
        host=olt['ip_address'],
        port=olt.get('port', 23),
        username=olt['username'],
        password=olt['password']
    )
    
    try:
        success, message = await asyncio.to_thread(conn.connect)
        if success:
            await db.olts.update_one(
                {'_id': ObjectId(olt_id)},
                {'$set': {'status': 'connected', 'last_test': datetime.now(timezone.utc)}}
            )
            return {'success': True, 'message': message}
        else:
            await db.olts.update_one(
                {'_id': ObjectId(olt_id)},
                {'$set': {'status': 'disconnected', 'last_test': datetime.now(timezone.utc)}}
            )
            return {'success': False, 'message': message}
    except Exception as e:
        await db.olts.update_one(
            {'_id': ObjectId(olt_id)},
            {'$set': {'status': 'error', 'last_test': datetime.now(timezone.utc)}}
        )
        return {'success': False, 'message': str(e)}
    finally:
        conn.disconnect()

# ============================================================
# PROFILE ENDPOINTS
# ============================================================

@api_router.get("/profiles")
async def list_profiles(user=Depends(get_current_user)):
    profiles = await db.profiles.find().to_list(100)
    result = []
    for p in profiles:
        s = serialize_doc(p)
        # Also get OLT name
        try:
            olt = await db.olts.find_one({'_id': ObjectId(p.get('olt_id', ''))})
            s['olt_name'] = olt['name'] if olt else 'Unknown'
            s['olt_ip'] = olt['ip_address'] if olt else ''
        except:
            s['olt_name'] = 'Unknown'
            s['olt_ip'] = ''
        result.append(s)
    return result

@api_router.post("/profiles")
async def create_profile(data: ProfileCreate, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc['created_at'] = datetime.now(timezone.utc)
    doc['created_by'] = user['username']
    doc['status'] = 'active'
    result = await db.profiles.insert_one(doc)
    doc['_id'] = result.inserted_id
    return serialize_doc(doc)

@api_router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, data: ProfileUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data['updated_at'] = datetime.now(timezone.utc)
    await db.profiles.update_one({'_id': ObjectId(profile_id)}, {'$set': update_data})
    profile = await db.profiles.find_one({'_id': ObjectId(profile_id)})
    return serialize_doc(profile)

@api_router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: str, user=Depends(get_current_user)):
    result = await db.profiles.delete_one({'_id': ObjectId(profile_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile tidak ditemukan")
    return {'message': 'Profile berhasil dihapus'}

# ============================================================
# DISCOVERY ENDPOINTS
# ============================================================

@api_router.post("/discovery/scan")
async def scan_ont_autofind(data: DiscoveryRequest, user=Depends(get_current_user)):
    olt = await db.olts.find_one({'_id': ObjectId(data.olt_id)})
    if not olt:
        raise HTTPException(status_code=404, detail="OLT tidak ditemukan")
    
    from olt_telnet import HuaweiOLTConnection, parse_autofind_output
    conn = HuaweiOLTConnection(
        host=olt['ip_address'],
        port=olt.get('port', 23),
        username=olt['username'],
        password=olt['password']
    )
    
    try:
        success, msg = await asyncio.to_thread(conn.connect)
        if not success:
            raise HTTPException(status_code=500, detail=f"Gagal koneksi ke OLT: {msg}")
        
        raw_output = await asyncio.to_thread(conn.send_command, "display ont autofind all")
        discovered = parse_autofind_output(raw_output)
        
        # Save discovery snapshot
        discovery_doc = {
            'olt_id': data.olt_id,
            'olt_name': olt['name'],
            'scanned_at': datetime.now(timezone.utc),
            'scanned_by': user['username'],
            'raw_output': raw_output,
            'onts': discovered,
            'count': len(discovered)
        }
        await db.discoveries.insert_one(discovery_doc)
        
        return {
            'success': True,
            'count': len(discovered),
            'onts': discovered,
            'scanned_at': datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Discovery scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.disconnect()

@api_router.get("/discovery/latest/{olt_id}")
async def get_latest_discovery(olt_id: str, user=Depends(get_current_user)):
    discovery = await db.discoveries.find_one(
        {'olt_id': olt_id},
        sort=[('scanned_at', -1)]
    )
    if not discovery:
        return {'onts': [], 'count': 0}
    return serialize_doc(discovery)

# ============================================================
# REGISTRATION ENDPOINTS
# ============================================================

@api_router.post("/register")
async def register_onts(data: RegisterRequest, user=Depends(get_current_user)):
    olt = await db.olts.find_one({'_id': ObjectId(data.olt_id)})
    if not olt:
        raise HTTPException(status_code=404, detail="OLT tidak ditemukan")
    
    profile = await db.profiles.find_one({'_id': ObjectId(data.profile_id)})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile tidak ditemukan")
    
    from olt_telnet import HuaweiOLTConnection, parse_ont_info_output, parse_service_port_output
    from olt_telnet import find_next_available_ont_id, find_next_available_service_port
    from olt_telnet import generate_ont_add_command, generate_service_port_command, is_command_successful, get_command_failure_reason
    
    conn = HuaweiOLTConnection(
        host=olt['ip_address'],
        port=olt.get('port', 23),
        username=olt['username'],
        password=olt['password']
    )
    
    results = []
    
    try:
        success, msg = await asyncio.to_thread(conn.connect)
        if not success:
            raise HTTPException(status_code=500, detail=f"Gagal koneksi ke OLT: {msg}")
        
        # Get existing service ports for auto-detection
        sp_raw = await asyncio.to_thread(conn.send_command, "display service-port all")
        existing_sp = parse_service_port_output(sp_raw)
        
        for entry in data.ont_entries:
            sn = entry['sn']
            fsp = entry.get('fsp', '0/0/0')
            description = entry.get('description', '')
            
            parts = fsp.split('/')
            frame = int(parts[0]) if len(parts) > 0 else 0
            slot = int(parts[1]) if len(parts) > 1 else 0
            port = int(parts[2]) if len(parts) > 2 else 0
            
            reg_result = {
                'sn': sn,
                'fsp': fsp,
                'description': description,
                'success': False,
                'ont_id': None,
                'service_port_id': None,
                'commands': [],
                'output': [],
                'error': None
            }
            
            try:
                # Get existing ONTs on this port for auto-detection
                await asyncio.to_thread(conn.send_command, f"interface gpon {frame}/{slot}")
                ont_raw = await asyncio.to_thread(conn.send_command, f"display ont info {port} all")
                existing_onts = parse_ont_info_output(ont_raw)
                await asyncio.to_thread(conn.send_command, "quit")
                
                # Auto-detect next ONT ID
                next_ont_id = find_next_available_ont_id(existing_onts)
                if next_ont_id is None:
                    reg_result['error'] = 'Tidak ada ONT ID tersedia pada port ini'
                    results.append(reg_result)
                    continue
                
                # Auto-detect next service port
                next_sp_id = find_next_available_service_port(existing_sp)
                if next_sp_id is None:
                    reg_result['error'] = 'Tidak ada service-port ID tersedia'
                    results.append(reg_result)
                    continue
                
                reg_result['ont_id'] = next_ont_id
                reg_result['service_port_id'] = next_sp_id
                
                # Enter interface and add ONT
                await asyncio.to_thread(conn.send_command, f"interface gpon {frame}/{slot}")
                
                ont_cmd = generate_ont_add_command(
                    pon_port=port,
                    ont_id=next_ont_id,
                    sn=sn,
                    line_profile_id=profile['line_profile_id'],
                    srv_profile_id=profile['srv_profile_id'],
                    description=description
                )
                reg_result['commands'].append(ont_cmd)
                ont_output = await asyncio.to_thread(conn.send_command, ont_cmd)
                reg_result['output'].append(ont_output)
                if not is_command_successful(ont_output):
                    reason = get_command_failure_reason(ont_output) or 'unknown reason'
                    raise Exception(f"Command ONT add gagal di OLT: {reason}")

                # Exit interface
                await asyncio.to_thread(conn.send_command, "quit")
                
                # Parse VLANs from profile
                vlans = [v.strip() for v in profile.get('business_vlans', '').split(',') if v.strip()]
                
                # Add service port for each VLAN (or just the first one)
                for vlan_str in (vlans if vlans else ['40']):
                    try:
                        vlan = int(vlan_str.split('-')[0])  # Handle ranges like 100-101
                    except ValueError:
                        continue
                    
                    sp_cmd = generate_service_port_command(
                        sp_id=next_sp_id,
                        vlan=vlan,
                        frame=frame,
                        slot=slot,
                        port=port,
                        ont_id=next_ont_id,
                        gemport=profile.get('gemport', 1),
                        user_vlan=profile.get('user_vlan') or vlan
                    )
                    reg_result['commands'].append(sp_cmd)
                    sp_output = await asyncio.to_thread(conn.send_command, sp_cmd)
                    reg_result['output'].append(sp_output)
                    if not is_command_successful(sp_output):
                        reason = get_command_failure_reason(sp_output) or 'unknown reason'
                        raise Exception(f"Command service-port gagal di OLT: {reason}")

                    # Add to existing SP list for next iteration
                    existing_sp.append(next_sp_id)
                    next_sp_id = find_next_available_service_port(existing_sp)
                    
                    break  # Only first VLAN for now
                
                reg_result['success'] = True
                
            except Exception as e:
                reg_result['error'] = str(e)
            
            results.append(reg_result)
            
            # Log registration
            log_doc = {
                'olt_id': data.olt_id,
                'olt_name': olt['name'],
                'profile_id': data.profile_id,
                'profile_name': profile['name'],
                'sn': sn,
                'fsp': fsp,
                'ont_id': reg_result['ont_id'],
                'service_port_id': reg_result['service_port_id'],
                'description': description,
                'success': reg_result['success'],
                'error': reg_result.get('error'),
                'commands': reg_result['commands'],
                'output': reg_result['output'],
                'registered_at': datetime.now(timezone.utc),
                'registered_by': user['username']
            }
            await db.registration_logs.insert_one(log_doc)
        
        return {
            'success': all(r['success'] for r in results),
            'results': results,
            'total': len(results),
            'success_count': sum(1 for r in results if r['success']),
            'fail_count': sum(1 for r in results if not r['success'])
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.disconnect()

# ============================================================
# REGISTRATION LOGS ENDPOINTS
# ============================================================

@api_router.get("/logs")
async def get_registration_logs(user=Depends(get_current_user), limit: int = 100, skip: int = 0):
    logs = await db.registration_logs.find().sort('registered_at', -1).skip(skip).limit(limit).to_list(limit)
    total = await db.registration_logs.count_documents({})
    return {'logs': [serialize_doc(l) for l in logs], 'total': total}

@api_router.get("/logs/{log_id}")
async def get_log_detail(log_id: str, user=Depends(get_current_user)):
    log = await db.registration_logs.find_one({'_id': ObjectId(log_id)})
    if not log:
        raise HTTPException(status_code=404, detail="Log tidak ditemukan")
    return serialize_doc(log)

# ============================================================
# DASHBOARD STATS
# ============================================================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    total_olts = await db.olts.count_documents({})
    total_profiles = await db.profiles.count_documents({})
    total_registrations = await db.registration_logs.count_documents({})
    success_registrations = await db.registration_logs.count_documents({'success': True})
    failed_registrations = await db.registration_logs.count_documents({'success': False})
    
    # Today's registrations
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_registrations = await db.registration_logs.count_documents(
        {'registered_at': {'$gte': today_start}}
    )
    
    # Recent logs
    recent_logs = await db.registration_logs.find().sort('registered_at', -1).limit(5).to_list(5)
    
    return {
        'total_olts': total_olts,
        'total_profiles': total_profiles,
        'total_registrations': total_registrations,
        'success_registrations': success_registrations,
        'failed_registrations': failed_registrations,
        'today_registrations': today_registrations,
        'recent_logs': [serialize_doc(l) for l in recent_logs]
    }

# ============================================================
# HEALTH CHECK
# ============================================================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OLT Huawei Registration"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
