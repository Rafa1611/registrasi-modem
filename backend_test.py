#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for OLT Huawei Registration System
Tests all CRUD operations, authentication, and API endpoints
"""

import requests
import sys
import json
from datetime import datetime
import time

class OLTBackendTester:
    def __init__(self, base_url="https://olt-registration.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'users': [],
            'olts': [],
            'profiles': [],
            'logs': []
        }

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result with details"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
            if message:
                print(f"   → {message}")
        else:
            print(f"❌ {test_name}: FAILED")
            print(f"   → {message}")
            if response_data:
                print(f"   → Response: {response_data}")

    def make_request(self, method, endpoint, expected_status=200, data=None, headers=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            request_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            try:
                response_json = response.json()
            except:
                response_json = {"raw_response": response.text}

            return success, response_json, response.status_code

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test health check endpoint"""
        success, response, status = self.make_request('GET', '/health')
        
        if success and response.get('status') == 'healthy':
            self.log_result("Health Check", True, f"Status: {response.get('status')}")
            return True
        else:
            self.log_result("Health Check", False, f"Expected healthy status, got: {response}")
            return False

    def test_user_registration(self, username, password, full_name):
        """Test user registration"""
        data = {
            "username": username,
            "password": password,
            "full_name": full_name
        }
        
        success, response, status = self.make_request('POST', '/auth/register', 200, data)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']  # Store token for subsequent requests
            user_id = response['user'].get('id')
            if user_id:
                self.created_resources['users'].append(user_id)
            self.log_result("User Registration", True, f"Registered user: {username}")
            return True, response
        else:
            self.log_result("User Registration", False, f"Status: {status}", response)
            return False, response

    def test_user_login(self, username, password):
        """Test user login"""
        data = {
            "username": username,
            "password": password
        }
        
        success, response, status = self.make_request('POST', '/auth/login', 200, data)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.log_result("User Login", True, f"Logged in user: {username}")
            return True, response
        else:
            self.log_result("User Login", False, f"Status: {status}", response)
            return False, response

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response, status = self.make_request('GET', '/auth/me')
        
        if success and 'username' in response:
            self.log_result("Get Current User", True, f"User: {response.get('username')}")
            return True, response
        else:
            self.log_result("Get Current User", False, f"Status: {status}", response)
            return False, response

    def test_olt_crud_operations(self):
        """Test complete OLT CRUD operations"""
        results = []
        
        # 1. List OLTs (should be empty initially)
        success, response, status = self.make_request('GET', '/olts')
        results.append(('List OLTs (initial)', success and isinstance(response, list)))
        
        if results[-1][1]:
            self.log_result("List OLTs (initial)", True, f"Found {len(response)} OLTs")
        else:
            self.log_result("List OLTs (initial)", False, f"Status: {status}", response)

        # 2. Create OLT
        olt_data = {
            "name": "Test OLT Huawei",
            "ip_address": "192.168.100.1",
            "port": 23,
            "username": "admin",
            "password": "admin123",
            "description": "Test OLT for automated testing",
            "olt_version": "MA5600V800R018C00"
        }
        
        success, response, status = self.make_request('POST', '/olts', 200, olt_data)
        olt_id = None
        
        if success and 'id' in response:
            olt_id = response['id']
            self.created_resources['olts'].append(olt_id)
            results.append(('Create OLT', True))
            self.log_result("Create OLT", True, f"Created OLT ID: {olt_id}")
        else:
            results.append(('Create OLT', False))
            self.log_result("Create OLT", False, f"Status: {status}", response)

        # 3. Get specific OLT
        if olt_id:
            success, response, status = self.make_request('GET', f'/olts/{olt_id}')
            if success and response.get('id') == olt_id:
                results.append(('Get OLT by ID', True))
                self.log_result("Get OLT by ID", True, f"Retrieved OLT: {response.get('name')}")
            else:
                results.append(('Get OLT by ID', False))
                self.log_result("Get OLT by ID", False, f"Status: {status}", response)

        # 4. Update OLT
        if olt_id:
            update_data = {
                "name": "Updated Test OLT",
                "description": "Updated description for testing"
            }
            success, response, status = self.make_request('PUT', f'/olts/{olt_id}', 200, update_data)
            if success and response.get('name') == "Updated Test OLT":
                results.append(('Update OLT', True))
                self.log_result("Update OLT", True, f"Updated OLT name to: {response.get('name')}")
            else:
                results.append(('Update OLT', False))
                self.log_result("Update OLT", False, f"Status: {status}", response)

        # 5. List OLTs again (should show our created OLT)
        success, response, status = self.make_request('GET', '/olts')
        if success and len(response) > 0:
            found_our_olt = any(olt.get('id') == olt_id for olt in response if isinstance(olt, dict))
            results.append(('List OLTs (after create)', found_our_olt))
            if found_our_olt:
                self.log_result("List OLTs (after create)", True, f"Found our OLT in list of {len(response)}")
            else:
                self.log_result("List OLTs (after create)", False, "Our OLT not found in list")
        else:
            results.append(('List OLTs (after create)', False))
            self.log_result("List OLTs (after create)", False, f"Status: {status}", response)

        return all(result[1] for result in results), olt_id

    def test_profile_crud_operations(self, olt_id):
        """Test complete Profile CRUD operations"""
        if not olt_id:
            self.log_result("Profile CRUD", False, "No OLT ID available for profile testing")
            return False, None
            
        results = []
        
        # 1. List Profiles (initial)
        success, response, status = self.make_request('GET', '/profiles')
        results.append(('List Profiles (initial)', success and isinstance(response, list)))
        
        if results[-1][1]:
            self.log_result("List Profiles (initial)", True, f"Found {len(response)} profiles")
        else:
            self.log_result("List Profiles (initial)", False, f"Status: {status}", response)

        # 2. Create Profile
        profile_data = {
            "name": "Test Profile VLAN40",
            "olt_id": olt_id,
            "description": "Test registration profile",
            "pon_type": "gpon",
            "device_type": "hgu",
            "line_profile_id": 15,
            "srv_profile_id": 15,
            "register_method": "sn",
            "business_vlans": "40,41",
            "gemport": 1,
            "user_vlan": 40,
            "priority": 0
        }
        
        success, response, status = self.make_request('POST', '/profiles', 200, profile_data)
        profile_id = None
        
        if success and 'id' in response:
            profile_id = response['id']
            self.created_resources['profiles'].append(profile_id)
            results.append(('Create Profile', True))
            self.log_result("Create Profile", True, f"Created Profile ID: {profile_id}")
        else:
            results.append(('Create Profile', False))
            self.log_result("Create Profile", False, f"Status: {status}", response)

        # 3. Update Profile
        if profile_id:
            update_data = {
                "name": "Updated Test Profile",
                "business_vlans": "40,41,42"
            }
            success, response, status = self.make_request('PUT', f'/profiles/{profile_id}', 200, update_data)
            if success and response.get('name') == "Updated Test Profile":
                results.append(('Update Profile', True))
                self.log_result("Update Profile", True, f"Updated profile name")
            else:
                results.append(('Update Profile', False))
                self.log_result("Update Profile", False, f"Status: {status}", response)

        # 4. List Profiles (after create)
        success, response, status = self.make_request('GET', '/profiles')
        if success and len(response) > 0:
            found_our_profile = any(profile.get('id') == profile_id for profile in response if isinstance(profile, dict))
            results.append(('List Profiles (after create)', found_our_profile))
            if found_our_profile:
                self.log_result("List Profiles (after create)", True, f"Found our profile in list of {len(response)}")
            else:
                self.log_result("List Profiles (after create)", False, "Our profile not found in list")
        else:
            results.append(('List Profiles (after create)', False))
            self.log_result("List Profiles (after create)", False, f"Status: {status}", response)

        return all(result[1] for result in results), profile_id

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response, status = self.make_request('GET', '/dashboard/stats')
        
        expected_fields = ['total_olts', 'total_profiles', 'total_registrations', 
                          'success_registrations', 'failed_registrations', 
                          'today_registrations', 'recent_logs']
        
        if success and all(field in response for field in expected_fields):
            self.log_result("Dashboard Stats", True, f"All required fields present")
            return True, response
        else:
            missing_fields = [f for f in expected_fields if f not in response]
            self.log_result("Dashboard Stats", False, f"Missing fields: {missing_fields}", response)
            return False, response

    def test_registration_logs(self):
        """Test registration logs endpoint"""
        success, response, status = self.make_request('GET', '/logs')
        
        if success and 'logs' in response and 'total' in response:
            self.log_result("Registration Logs", True, f"Found {response['total']} logs")
            return True, response
        else:
            self.log_result("Registration Logs", False, f"Status: {status}", response)
            return False, response

    def test_telnet_dependent_endpoints(self, olt_id):
        """Test telnet-dependent endpoints (expected to fail in this environment)"""
        if not olt_id:
            self.log_result("Telnet Tests", False, "No OLT ID available")
            return False
            
        # Test OLT connection (expected to fail)
        success, response, status = self.make_request('POST', f'/olts/{olt_id}/test', 200)
        # This should fail because no real OLT is available
        self.log_result("OLT Test Connection", not success, "Expected to fail - no real OLT available")
        
        # Test ONT discovery (expected to fail) 
        discovery_data = {"olt_id": olt_id}
        success, response, status = self.make_request('POST', '/discovery/scan', 200, discovery_data)
        self.log_result("ONT Discovery", not success, "Expected to fail - no real OLT available")
        
        return True  # These are expected to fail

    def cleanup_resources(self):
        """Clean up created test resources"""
        cleanup_results = []
        
        # Delete created profiles
        for profile_id in self.created_resources['profiles']:
            success, _, status = self.make_request('DELETE', f'/profiles/{profile_id}', 200)
            cleanup_results.append(f"Profile {profile_id}: {'✅' if success else '❌'}")
        
        # Delete created OLTs  
        for olt_id in self.created_resources['olts']:
            success, _, status = self.make_request('DELETE', f'/olts/{olt_id}', 200)
            cleanup_results.append(f"OLT {olt_id}: {'✅' if success else '❌'}")
            
        if cleanup_results:
            print(f"\n🧹 Cleanup Results:")
            for result in cleanup_results:
                print(f"   {result}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("🔧 OLT Huawei Registration System - Backend API Tests")
        print("=" * 60)
        
        # Generate unique test user
        timestamp = int(time.time())
        test_username = f"testuser_{timestamp}"
        test_password = "TestPass123!"
        
        try:
            # 1. Health Check
            self.test_health_check()
            
            # 2. User Registration & Authentication
            self.test_user_registration(test_username, test_password, "Test User")
            
            # Also test with existing admin user if available
            admin_success, _ = self.test_user_login("admin", "admin123")
            if not admin_success:
                print("   💡 Admin user not found, continuing with registered user")
            
            # 3. Get current user
            self.test_get_current_user()
            
            # 4. OLT Management
            olt_success, olt_id = self.test_olt_crud_operations()
            
            # 5. Profile Management
            profile_success, profile_id = self.test_profile_crud_operations(olt_id)
            
            # 6. Dashboard Stats
            self.test_dashboard_stats()
            
            # 7. Registration Logs
            self.test_registration_logs()
            
            # 8. Telnet-dependent endpoints (expected to fail)
            self.test_telnet_dependent_endpoints(olt_id)
            
        except Exception as e:
            print(f"\n❌ Test execution error: {e}")
            
        finally:
            # Cleanup
            self.cleanup_resources()
            
            # Results Summary
            print("\n" + "=" * 60)
            print(f"📊 Backend Test Results: {self.tests_passed}/{self.tests_run} PASSED")
            print("=" * 60)
            
            if self.tests_passed == self.tests_run:
                print("🎉 All backend tests passed!")
                return 0
            else:
                failure_rate = ((self.tests_run - self.tests_passed) / self.tests_run) * 100
                print(f"⚠️  {failure_rate:.1f}% of tests failed")
                return 1

def main():
    """Main test execution"""
    tester = OLTBackendTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())