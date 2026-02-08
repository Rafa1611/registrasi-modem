"""
Huawei MA5600 OLT Telnet Module
Handles telnet connection, command execution, and CLI output parsing.
"""
import telnetlib
import re
import time
import logging

logger = logging.getLogger(__name__)


class HuaweiOLTConnection:
    """Manages telnet connection to Huawei MA5600 OLT."""
    
    def __init__(self, host, port=23, username='', password='', timeout=15):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.timeout = timeout
        self.tn = None
    
    def connect(self):
        """Connect and authenticate to OLT. Returns (success, message)."""
        try:
            logger.info(f"Connecting to OLT {self.host}:{self.port}")
            self.tn = telnetlib.Telnet(self.host, self.port, self.timeout)
            
            # Wait for Username prompt
            self.tn.read_until(b"name:", timeout=self.timeout)
            self.tn.write(self.username.encode('ascii') + b"\n")
            
            # Wait for Password prompt
            self.tn.read_until(b"assword:", timeout=self.timeout)
            self.tn.write(self.password.encode('ascii') + b"\n")
            
            # Wait for prompt (>)
            idx, match, text = self.tn.expect([b">", b"failed", b"invalid"], timeout=self.timeout)
            if idx != 0:
                return (False, "Login gagal: username/password salah")
            
            # Enter enable mode
            self.tn.write(b"enable\n")
            self.tn.read_until(b"#", timeout=self.timeout)
            
            # Enter config mode
            self.tn.write(b"config\n")
            self.tn.read_until(b"(config)#", timeout=self.timeout)
            
            logger.info(f"Successfully connected to OLT {self.host}")
            return (True, "Berhasil terkoneksi ke OLT")
            
        except ConnectionRefusedError:
            return (False, f"Koneksi ditolak oleh {self.host}:{self.port}")
        except TimeoutError:
            return (False, f"Timeout koneksi ke {self.host}:{self.port}")
        except OSError as e:
            return (False, f"Gagal koneksi: {str(e)}")
        except Exception as e:
            return (False, f"Error: {str(e)}")
    
    def send_command(self, command, wait_for=b"#", timeout=30):
        """Send a command and return the output, handling pagination."""
        if not self.tn:
            raise Exception("Tidak terkoneksi ke OLT")
        
        logger.info(f"Sending command: {command}")
        self.tn.write(command.encode('ascii') + b"\n")
        
        output = ""
        while True:
            try:
                idx, match, text = self.tn.expect(
                    [b"---- More", b"Press 'Q'", wait_for],
                    timeout=timeout
                )
                decoded = text.decode('ascii', errors='ignore')
                output += decoded
                
                if idx in (0, 1):
                    # Pagination - send space to continue
                    self.tn.write(b" ")
                    time.sleep(0.3)
                else:
                    # Got prompt, done
                    break
            except EOFError:
                break
            except Exception as e:
                logger.error(f"Error reading command output: {e}")
                break
        
        return output
    
    def disconnect(self):
        """Close the connection."""
        if self.tn:
            try:
                self.tn.write(b"quit\n")
                time.sleep(0.2)
                self.tn.write(b"quit\n")
                time.sleep(0.2)
                self.tn.write(b"quit\n")
                time.sleep(0.2)
                self.tn.close()
            except:
                pass
            self.tn = None


# ============================================================
# PARSING FUNCTIONS
# ============================================================

def parse_autofind_output(raw_output):
    """Parse 'display ont autofind all' output into structured data."""
    results = []
    current_ont = {}
    
    for line in raw_output.strip().split('\n'):
        line = line.strip()
        if not line:
            if current_ont and 'sn' in current_ont:
                results.append(current_ont)
                current_ont = {}
            continue
        
        # Skip summary lines
        if line.startswith('The total') or line.startswith('----'):
            if current_ont and 'sn' in current_ont:
                results.append(current_ont)
                current_ont = {}
            continue
        
        # Parse key-value pairs
        match = re.match(r'^(.+?)\s*:\s*(.*)$', line)
        if match:
            key = match.group(1).strip()
            value = match.group(2).strip()
            
            if key == 'Number':
                if current_ont and 'sn' in current_ont:
                    results.append(current_ont)
                current_ont = {'number': int(value)}
            elif key == 'F/S/P':
                current_ont['fsp'] = value
                parts = value.split('/')
                if len(parts) == 3:
                    current_ont['frame'] = int(parts[0])
                    current_ont['slot'] = int(parts[1])
                    current_ont['port'] = int(parts[2])
            elif key == 'Ont SN':
                sn_match = re.match(r'(\w+)\s*(?:\((.+)\))?', value)
                if sn_match:
                    current_ont['sn'] = sn_match.group(1)
                    current_ont['sn_friendly'] = sn_match.group(2) or ''
            elif key == 'Password':
                current_ont['password'] = value
            elif key == 'Loid':
                current_ont['loid'] = value
            elif key == 'Checkcode':
                current_ont['checkcode'] = value
            elif key == 'VendorID':
                current_ont['vendor_id'] = value
            elif key == 'Ont Version':
                current_ont['ont_version'] = value
            elif key == 'Ont SoftwareVersion':
                current_ont['software_version'] = value
            elif key == 'Ont EquipmentID':
                current_ont['equipment_id'] = value
            elif key == 'Ont autofind time':
                current_ont['autofind_time'] = value
    
    if current_ont and 'sn' in current_ont:
        results.append(current_ont)
    
    return results


def parse_ont_info_output(raw_output):
    """Parse 'display ont info X all' to get list of existing ONT IDs."""
    ont_ids = []
    
    for line in raw_output.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('-') or line.startswith('F/S/P') or line.startswith('In port'):
            continue
        if 'ONT' in line and 'ID' in line and 'SN' in line:
            continue
        
        parts = line.split()
        if len(parts) >= 4:
            try:
                fsp = parts[0]
                if '/' in fsp:
                    ont_id = int(parts[1])
                    sn = parts[2]
                    ont_ids.append({
                        'ont_id': ont_id,
                        'sn': sn,
                        'control_flag': parts[3] if len(parts) > 3 else '',
                        'run_state': parts[4] if len(parts) > 4 else '',
                        'config_state': parts[5] if len(parts) > 5 else '',
                    })
            except (ValueError, IndexError):
                continue
    
    return ont_ids


def parse_service_port_output(raw_output):
    """Parse 'display service-port all' to get list of existing service port IDs."""
    sp_ids = []
    
    for line in raw_output.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('-') or line.startswith('INDEX') or line.startswith('VLAN'):
            continue
        
        parts = line.split()
        if len(parts) >= 2:
            try:
                sp_id = int(parts[0])
                sp_ids.append(sp_id)
            except ValueError:
                continue
    
    return sp_ids


def find_next_available_ont_id(existing_onts, max_id=127):
    """Find the next available ONT ID (0-127)."""
    used_ids = set(ont['ont_id'] for ont in existing_onts)
    for i in range(max_id + 1):
        if i not in used_ids:
            return i
    return None


def find_next_available_service_port(existing_sp_ids, max_id=4095):
    """Find the next available service-port ID."""
    used_ids = set(existing_sp_ids)
    for i in range(1, max_id + 1):
        if i not in used_ids:
            return i
    return None


def generate_ont_add_command(ont_id, sn, line_profile_id, srv_profile_id, description=""):
    """Generate the ont add CLI command."""
    desc_part = f' desc "{description}"' if description else ''
    cmd = f'ont add 0 {ont_id} sn-auth "{sn}" omci ont-lineprofile-id {line_profile_id} ont-srvprofile-id {srv_profile_id}{desc_part}'
    return cmd


def generate_service_port_command(sp_id, vlan, frame, slot, port, ont_id, gemport, user_vlan=None):
    """Generate the service-port CLI command."""
    uv = user_vlan if user_vlan else vlan
    cmd = f'service-port {sp_id} vlan {vlan} gpon {frame}/{slot}/{port} ont {ont_id} gemport {gemport} multi-service user-vlan {uv} tag-transform translate'
    return cmd
