"""
POC: Huawei MA5600 OLT Telnet Module - Parsing Logic Test
Tests parsing of CLI outputs without actual OLT connection.
"""
import re
import telnetlib
import time

# ============================================================
# MOCK CLI OUTPUTS FOR TESTING PARSING
# ============================================================

MOCK_AUTOFIND_OUTPUT = """
   Number              : 1
   F/S/P               : 0/1/7
   Ont SN              : 414C434CB443689D (ALCL-B443689D)
   Password            : 0x00000000000000000000
   Loid                :
   Checkcode           :
   VendorID            : ALCL
   Ont Version         : 3FE56641AOCK20
   Ont SoftwareVersion : 3FE56641AOCK20
   Ont EquipmentID     : G-140W-MD
   Ont autofind time   : 2024-01-15 10:30:25+07:00

   Number              : 2
   F/S/P               : 0/2/3
   Ont SN              : 48575443D7B00234 (HWTC-D7B00234)
   Password            : 0x00000000000000000000
   Loid                :
   Checkcode           :
   VendorID            : HWTC
   Ont Version         : 168D.A
   Ont SoftwareVersion : V5R020C10S115
   Ont EquipmentID     : EG8145V5
   Ont autofind time   : 2024-01-15 10:31:45+07:00

   Number              : 3
   F/S/P               : 0/1/3
   Ont SN              : 5A54454754A12345 (ZTEG-54A12345)
   Password            : 0x00000000000000000000
   Loid                :
   Checkcode           :
   VendorID            : ZTEG
   Ont Version         : V6.0.10P6T3
   Ont SoftwareVersion : V6.0.10P6T3
   Ont EquipmentID     : F670L
   Ont autofind time   : 2024-01-15 10:32:10+07:00

   The total of ONTs autofind is:  3
"""

MOCK_ONT_INFO_OUTPUT = """
  -----------------------------------------------------------------------------
  F/S/P   ONT         SN         Control     Run      Config   Match    Protect
          ID                     flag        state    state    state    side
  -----------------------------------------------------------------------------
  0/1/7    0    414C434CB443000A  active      online   normal   match    no
  0/1/7    1    48575443D7B00111  active      online   normal   match    no
  0/1/7    3    5A54454754A00222  active      offline  normal   match    no
  0/1/7    5    414C434CB443333C  deactivated offline  normal   match    no
  -----------------------------------------------------------------------------
  In port 0/1/7, the total of ONTs are: 4, online: 2
  -----------------------------------------------------------------------------
"""

MOCK_SERVICE_PORT_OUTPUT = """
  -------------------------------------------------------------------------
  INDEX  VLAN VLAN     PORT                  F/ S/P  VPI  VCI  FLOW  FLOW
         ID   ATTR                                            TYPE  PARA
  -------------------------------------------------------------------------
  1      40   common   gpon 0/1/7 /0         -    -   1    -     -
  2      40   common   gpon 0/1/7 /1         -    -   1    -     -
  5      88   common   gpon 0/2/3 /0         -    -   1    -     -
  100    40   common   gpon 0/1/3 /0         -    -   1    -     -
  103    881  common   gpon 0/1/7 /3         -    -   1    -     -
  104    40   common   gpon 0/1/7 /5         -    -   1    -     -
  -------------------------------------------------------------------------
"""

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
            if current_ont:
                results.append(current_ont)
                current_ont = {}
            continue
        
        # Skip summary lines
        if line.startswith('The total') or line.startswith('----'):
            if current_ont:
                results.append(current_ont)
                current_ont = {}
            continue
        
        # Parse key-value pairs
        match = re.match(r'^(.+?)\s*:\s*(.*)$', line)
        if match:
            key = match.group(1).strip()
            value = match.group(2).strip()
            
            if key == 'Number':
                if current_ont:
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
                # Extract SN and friendly name
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
    
    # Don't forget last ONT
    if current_ont:
        results.append(current_ont)
    
    return results


def parse_ont_info_output(raw_output):
    """Parse 'display ont info 0 all' to get list of existing ONT IDs."""
    ont_ids = []
    
    for line in raw_output.strip().split('\n'):
        line = line.strip()
        if not line or line.startswith('-') or line.startswith('F/S/P') or line.startswith('In port') or 'ID' in line and 'SN' in line:
            continue
        
        # Try to parse ONT info line
        # Format: F/S/P  ONT_ID  SN  control_flag  run_state  config_state  match_state  protect
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
    # Start from 1
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


# ============================================================
# TELNET CONNECTION CLASS (for reference, not tested in POC)
# ============================================================

class HuaweiOLTConnection:
    """Manages telnet connection to Huawei MA5600 OLT."""
    
    def __init__(self, host, port=23, username='', password='', timeout=10):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.timeout = timeout
        self.tn = None
        self.prompt = ''
    
    def connect(self):
        """Connect and authenticate to OLT."""
        self.tn = telnetlib.Telnet(self.host, self.port, self.timeout)
        
        # Wait for Username prompt
        self.tn.read_until(b"name:", timeout=self.timeout)
        self.tn.write(self.username.encode('ascii') + b"\n")
        
        # Wait for Password prompt
        self.tn.read_until(b"assword:", timeout=self.timeout)
        self.tn.write(self.password.encode('ascii') + b"\n")
        
        # Wait for prompt (>)
        result = self.tn.read_until(b">", timeout=self.timeout)
        
        # Enter enable mode
        self.tn.write(b"enable\n")
        result = self.tn.read_until(b"#", timeout=self.timeout)
        
        # Enter config mode  
        self.tn.write(b"config\n")
        result = self.tn.read_until(b"(config)#", timeout=self.timeout)
        
        return True
    
    def send_command(self, command, wait_for=b"#", timeout=15):
        """Send a command and return the output, handling pagination."""
        self.tn.write(command.encode('ascii') + b"\n")
        
        output = ""
        while True:
            try:
                # Read with a timeout
                idx, match, text = self.tn.expect(
                    [b"---- More", wait_for], 
                    timeout=timeout
                )
                output += text.decode('ascii', errors='ignore')
                
                if idx == 0:
                    # Pagination - send space to continue
                    self.tn.write(b" ")
                else:
                    # Got prompt, done
                    break
            except EOFError:
                break
        
        return output
    
    def autofind_onts(self):
        """Run display ont autofind all and parse results."""
        raw = self.send_command("display ont autofind all")
        return parse_autofind_output(raw)
    
    def get_existing_onts(self, frame, slot, port):
        """Get existing ONTs on a specific gpon port."""
        # Enter interface
        self.send_command(f"interface gpon {frame}/{slot}")
        raw = self.send_command(f"display ont info {port} all")
        # Exit interface
        self.send_command("quit")
        return parse_ont_info_output(raw)
    
    def get_existing_service_ports(self):
        """Get existing service ports."""
        raw = self.send_command("display service-port all")
        return parse_service_port_output(raw)
    
    def register_ont(self, frame, slot, port, ont_id, sn, line_profile_id, srv_profile_id, description,
                     sp_id, vlan, gemport, user_vlan=None):
        """Full ONT registration flow."""
        results = []
        
        # Enter gpon interface
        self.send_command(f"interface gpon {frame}/{slot}")
        
        # Add ONT
        ont_cmd = generate_ont_add_command(ont_id, sn, line_profile_id, srv_profile_id, description)
        ont_result = self.send_command(ont_cmd)
        results.append(('ont_add', ont_cmd, ont_result))
        
        # Exit interface
        self.send_command("quit")
        
        # Add service port (from config mode)
        sp_cmd = generate_service_port_command(sp_id, vlan, frame, slot, port, ont_id, gemport, user_vlan)
        sp_result = self.send_command(sp_cmd)
        results.append(('service_port', sp_cmd, sp_result))
        
        return results
    
    def disconnect(self):
        """Close the connection."""
        if self.tn:
            try:
                self.tn.write(b"quit\n")
                self.tn.write(b"quit\n")
                self.tn.write(b"quit\n")
                self.tn.close()
            except:
                pass


# ============================================================
# POC TESTS
# ============================================================

def test_parse_autofind():
    """Test parsing of autofind output."""
    print("=" * 60)
    print("TEST: Parse Autofind Output")
    print("=" * 60)
    
    results = parse_autofind_output(MOCK_AUTOFIND_OUTPUT)
    
    assert len(results) == 3, f"Expected 3 ONTs, got {len(results)}"
    
    # Check first ONT
    ont1 = results[0]
    assert ont1['number'] == 1
    assert ont1['fsp'] == '0/1/7'
    assert ont1['sn'] == '414C434CB443689D'
    assert ont1['sn_friendly'] == 'ALCL-B443689D'
    assert ont1['vendor_id'] == 'ALCL'
    assert ont1['equipment_id'] == 'G-140W-MD'
    assert ont1['frame'] == 0
    assert ont1['slot'] == 1
    assert ont1['port'] == 7
    
    # Check second ONT
    ont2 = results[1]
    assert ont2['sn'] == '48575443D7B00234'
    assert ont2['equipment_id'] == 'EG8145V5'
    
    # Check third ONT
    ont3 = results[2]
    assert ont3['sn'] == '5A54454754A12345'
    assert ont3['vendor_id'] == 'ZTEG'
    
    print(f"✓ Parsed {len(results)} ONTs successfully")
    for ont in results:
        print(f"  - #{ont['number']} F/S/P={ont['fsp']} SN={ont['sn']} ({ont.get('sn_friendly', '')}) Device={ont.get('equipment_id', '')}")
    print()


def test_parse_ont_info():
    """Test parsing of ONT info output."""
    print("=" * 60)
    print("TEST: Parse ONT Info Output")
    print("=" * 60)
    
    results = parse_ont_info_output(MOCK_ONT_INFO_OUTPUT)
    
    assert len(results) == 4, f"Expected 4 ONTs, got {len(results)}"
    
    ids = [ont['ont_id'] for ont in results]
    assert ids == [0, 1, 3, 5], f"Expected [0, 1, 3, 5], got {ids}"
    
    print(f"✓ Parsed {len(results)} existing ONTs")
    for ont in results:
        print(f"  - ONT_ID={ont['ont_id']} SN={ont['sn']} State={ont.get('run_state', '')}")
    print()


def test_parse_service_ports():
    """Test parsing of service port output."""
    print("=" * 60)
    print("TEST: Parse Service Port Output")
    print("=" * 60)
    
    results = parse_service_port_output(MOCK_SERVICE_PORT_OUTPUT)
    
    assert len(results) == 6, f"Expected 6 service ports, got {len(results)}"
    assert results == [1, 2, 5, 100, 103, 104], f"Expected [1, 2, 5, 100, 103, 104], got {results}"
    
    print(f"✓ Parsed {len(results)} service ports: {results}")
    print()


def test_auto_detect_ids():
    """Test auto-detection of next available IDs."""
    print("=" * 60)
    print("TEST: Auto-detect Next Available IDs")
    print("=" * 60)
    
    # Test ONT ID detection
    existing_onts = parse_ont_info_output(MOCK_ONT_INFO_OUTPUT)
    next_ont_id = find_next_available_ont_id(existing_onts)
    assert next_ont_id == 2, f"Expected next ONT ID = 2 (gap between 1 and 3), got {next_ont_id}"
    print(f"✓ Next available ONT ID: {next_ont_id} (existing: {[o['ont_id'] for o in existing_onts]})")
    
    # Test service port ID detection
    existing_sp = parse_service_port_output(MOCK_SERVICE_PORT_OUTPUT)
    next_sp = find_next_available_service_port(existing_sp)
    assert next_sp == 3, f"Expected next service port = 3 (gap after 1,2), got {next_sp}"
    print(f"✓ Next available service-port ID: {next_sp} (existing: {existing_sp})")
    print()


def test_command_generation():
    """Test CLI command generation."""
    print("=" * 60)
    print("TEST: Command Generation")
    print("=" * 60)
    
    # Test ONT add command
    ont_cmd = generate_ont_add_command(
        ont_id=2, 
        sn="414C434CB443689D",
        line_profile_id=15, 
        srv_profile_id=15, 
        description="Nokia Tes"
    )
    expected = 'ont add 0 2 sn-auth "414C434CB443689D" omci ont-lineprofile-id 15 ont-srvprofile-id 15 desc "Nokia Tes"'
    assert ont_cmd == expected, f"ONT command mismatch:\n  Got:      {ont_cmd}\n  Expected: {expected}"
    print(f"✓ ONT Add Command: {ont_cmd}")
    
    # Test service-port command
    sp_cmd = generate_service_port_command(
        sp_id=105, vlan=40, frame=0, slot=1, port=7,
        ont_id=2, gemport=1, user_vlan=40
    )
    expected_sp = 'service-port 105 vlan 40 gpon 0/1/7 ont 2 gemport 1 multi-service user-vlan 40 tag-transform translate'
    assert sp_cmd == expected_sp, f"Service port command mismatch:\n  Got:      {sp_cmd}\n  Expected: {expected_sp}"
    print(f"✓ Service Port Command: {sp_cmd}")
    print()


def test_full_workflow():
    """Test the full workflow simulation."""
    print("=" * 60)
    print("TEST: Full Workflow Simulation")
    print("=" * 60)
    
    # Step 1: Parse autofind
    discovered = parse_autofind_output(MOCK_AUTOFIND_OUTPUT)
    print(f"Step 1: Discovered {len(discovered)} ONTs")
    
    # Step 2: Get existing ONTs on the target port (0/1/7)
    existing_onts = parse_ont_info_output(MOCK_ONT_INFO_OUTPUT)
    print(f"Step 2: Found {len(existing_onts)} existing ONTs on port 0/1/7")
    
    # Step 3: Get existing service ports
    existing_sp = parse_service_port_output(MOCK_SERVICE_PORT_OUTPUT)
    print(f"Step 3: Found {len(existing_sp)} existing service ports")
    
    # Step 4: Auto-detect next IDs
    next_ont_id = find_next_available_ont_id(existing_onts)
    next_sp_id = find_next_available_service_port(existing_sp)
    print(f"Step 4: Next ONT ID = {next_ont_id}, Next Service Port = {next_sp_id}")
    
    # Step 5: Select first discovered ONT and generate commands
    target_ont = discovered[0]
    ont_cmd = generate_ont_add_command(
        ont_id=next_ont_id,
        sn=target_ont['sn'],
        line_profile_id=15,
        srv_profile_id=15,
        description=f"{target_ont.get('equipment_id', 'ONT')} Registration"
    )
    sp_cmd = generate_service_port_command(
        sp_id=next_sp_id, vlan=40,
        frame=target_ont['frame'], slot=target_ont['slot'], port=target_ont['port'],
        ont_id=next_ont_id, gemport=1, user_vlan=40
    )
    
    print(f"Step 5: Generated commands for ONT {target_ont['sn']}:")
    print(f"  interface gpon {target_ont['frame']}/{target_ont['slot']}")
    print(f"  {ont_cmd}")
    print(f"  quit")
    print(f"  {sp_cmd}")
    
    print()
    print("✓ Full workflow simulation completed successfully!")
    print()


if __name__ == '__main__':
    print("\n🔧 Huawei MA5600 OLT - Telnet Module POC\n")
    
    try:
        test_parse_autofind()
        test_parse_ont_info()
        test_parse_service_ports()
        test_auto_detect_ids()
        test_command_generation()
        test_full_workflow()
        
        print("=" * 60)
        print("ALL POC TESTS PASSED!")
        print("=" * 60)
        print("\nNote: Actual telnet connection to OLT cannot be tested")
        print("from this environment. The parsing logic and command")
        print("generation are verified with mock data.")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
