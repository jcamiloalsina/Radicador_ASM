import requests
import sys
import json
import os
import tempfile
from datetime import datetime

class CatastralAPITester:
    def __init__(self, base_url="https://land-registry-10.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.petitions = {}  # Store created petitions
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, form_data=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        # Set content type based on data format
        if not form_data:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if form_data:
                    response = requests.post(url, data=data, headers=headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self, role, email_suffix=""):
        """Test user registration for different roles"""
        timestamp = datetime.now().strftime('%H%M%S')
        email = f"test_{role}_{timestamp}{email_suffix}@test.com"
        
        user_data = {
            "email": email,
            "password": "TestPass123!",
            "full_name": f"Test {role.title()} User",
            "role": role
        }
        
        success, response = self.run_test(
            f"Register {role}",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'token' in response:
            self.tokens[role] = response['token']
            self.users[role] = response['user']
            print(f"   Registered user: {email}")
            return True
        return False

    def test_user_login(self, role):
        """Test user login"""
        if role not in self.users:
            print(f"❌ No user data for role {role}")
            return False
            
        user = self.users[role]
        login_data = {
            "email": user['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            f"Login {role}",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.tokens[role] = response['token']
            return True
        return False

    def test_get_current_user(self, role):
        """Test getting current user info"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        success, response = self.run_test(
            f"Get current user ({role})",
            "GET",
            "auth/me",
            200,
            token=self.tokens[role]
        )
        
        return success and response.get('role') == role

    def test_create_petition(self, role):
        """Test creating a petition"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        petition_data = {
            "nombre_completo": f"Juan Pérez {role}",
            "correo": f"juan.perez.{role}@test.com",
            "telefono": "3001234567",
            "tipo_tramite": "Certificado de Tradición y Libertad",
            "municipio": "Bogotá"
        }
        
        success, response = self.run_test(
            f"Create petition ({role})",
            "POST",
            "petitions",
            200,
            data=petition_data,
            token=self.tokens[role],
            form_data=True
        )
        
        if success and 'id' in response:
            if role not in self.petitions:
                self.petitions[role] = []
            self.petitions[role].append(response['id'])
            return True
        return False

    def test_get_petitions(self, role):
        """Test getting petitions (role-based access)"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        success, response = self.run_test(
            f"Get petitions ({role})",
            "GET",
            "petitions",
            200,
            token=self.tokens[role]
        )
        
        if success:
            petitions_count = len(response) if isinstance(response, list) else 0
            print(f"   Found {petitions_count} petitions for {role}")
            return True
        return False

    def test_get_petition_detail(self, role, petition_id):
        """Test getting petition details"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        success, response = self.run_test(
            f"Get petition detail ({role})",
            "GET",
            f"petitions/{petition_id}",
            200,
            token=self.tokens[role]
        )
        
        return success and response.get('id') == petition_id

    def test_update_petition(self, role, petition_id):
        """Test updating petition (role-based permissions)"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        # Different update data based on role
        if role == "coordinador":
            update_data = {
                "estado": "en_revision",
                "notas": f"Actualizado por {role}",
                "telefono": "3009876543"  # Coordinators can modify all fields
            }
        elif role == "atencion_usuario":
            update_data = {
                "estado": "en_revision",
                "notas": f"Actualizado por {role}"  # Staff can only update status and notes
            }
        else:
            # Citizens shouldn't be able to update
            expected_status = 403
            update_data = {"estado": "aprobada"}
            success, response = self.run_test(
                f"Update petition ({role}) - should fail",
                "PATCH",
                f"petitions/{petition_id}",
                expected_status,
                data=update_data,
                token=self.tokens[role]
            )
            return success
            
        success, response = self.run_test(
            f"Update petition ({role})",
            "PATCH",
            f"petitions/{petition_id}",
            200,
            data=update_data,
            token=self.tokens[role]
        )
        
        return success

    def test_dashboard_stats(self, role):
        """Test dashboard statistics"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        success, response = self.run_test(
            f"Get dashboard stats ({role})",
            "GET",
            "petitions/stats/dashboard",
            200,
            token=self.tokens[role]
        )
        
        if success:
            # Updated to match actual API response format
            required_fields = ['total', 'radicado', 'asignado', 'rechazado', 'revision', 'devuelto', 'finalizado']
            has_all_fields = all(field in response for field in required_fields)
            if has_all_fields:
                print(f"   Stats: Total={response['total']}, Radicado={response['radicado']}, Finalizado={response['finalizado']}")
                return True
            else:
                missing_fields = [field for field in required_fields if field not in response]
                print(f"   Missing required fields in stats response: {missing_fields}")
        return False

    def test_login_with_credentials(self, email, password, role_name):
        """Test login with specific credentials"""
        login_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            f"Login {role_name}",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.tokens[role_name] = response['token']
            self.users[role_name] = response['user']
            print(f"   Logged in as: {email}")
            return True
        return False

    def test_file_upload_by_staff(self, role, petition_id):
        """Test file upload by staff with role metadata"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        # Create a test file
        test_content = f"Test file uploaded by {role} at {datetime.now()}"
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(test_content)
                temp_file_path = f.name
            
            url = f"{self.api_url}/petitions/{petition_id}/upload"
            headers = {'Authorization': f'Bearer {self.tokens[role]}'}
            
            with open(temp_file_path, 'rb') as f:
                files = {'files': (f'test_file_{role}.txt', f, 'text/plain')}
                
                self.tests_run += 1
                print(f"\n🔍 Testing File Upload by {role}...")
                
                response = requests.post(url, headers=headers, files=files, timeout=30)
                
                success = response.status_code == 200
                if success:
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: {response.status_code}")
                    try:
                        result = response.json()
                        if 'files' in result and len(result['files']) > 0:
                            uploaded_file = result['files'][0]
                            print(f"   File uploaded with metadata:")
                            print(f"   - uploaded_by_role: {uploaded_file.get('uploaded_by_role')}")
                            print(f"   - uploaded_by_name: {uploaded_file.get('uploaded_by_name')}")
                            return True, result
                        return True, result
                    except:
                        return True, {}
                else:
                    print(f"❌ Failed - Expected 200, got {response.status_code}")
                    try:
                        error_detail = response.json()
                        print(f"   Error details: {error_detail}")
                    except:
                        print(f"   Response text: {response.text}")
                    return False, {}
                    
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file_path)
            except:
                pass

    def test_download_citizen_zip(self, role, petition_id):
        """Test downloading ZIP of citizen files"""
        if role not in self.tokens:
            print(f"❌ No token for role {role}")
            return False
            
        url = f"{self.api_url}/petitions/{petition_id}/download-zip"
        headers = {'Authorization': f'Bearer {self.tokens[role]}'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing ZIP Download by {role}...")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Check if response is a ZIP file
                content_type = response.headers.get('content-type', '')
                if 'zip' in content_type or 'application/zip' in content_type:
                    print(f"   ZIP file downloaded successfully")
                    print(f"   Content-Type: {content_type}")
                    print(f"   Content-Length: {len(response.content)} bytes")
                    return True
                else:
                    print(f"   Warning: Content-Type is {content_type}, expected ZIP")
                    return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_petition_file_operations(self):
        """Test file upload and download operations"""
        print("\n📁 Testing File Operations...")
        
        # First, we need a petition with citizen files
        # Let's use the specific petition mentioned: RASMCG-0006-06-01-2026
        test_petition_id = "RASMCG-0006-06-01-2026"
        
        # Try to get petition details first to see if it exists
        if 'admin' in self.tokens:
            success, petition_data = self.run_test(
                "Get test petition details",
                "GET", 
                f"petitions/{test_petition_id}",
                200,
                token=self.tokens['admin']
            )
            
            if not success:
                print(f"❌ Test petition {test_petition_id} not found, skipping file tests")
                return False
                
            print(f"   Found petition: {petition_data.get('radicado', 'Unknown')}")
            
            # Test file upload by admin (staff)
            upload_success, upload_result = self.test_file_upload_by_staff('admin', test_petition_id)
            
            # Test ZIP download by admin
            if upload_success:
                download_success = self.test_download_citizen_zip('admin', test_petition_id)
                return download_success
            
        return False

    def test_password_recovery_endpoints(self):
        """Test password recovery functionality"""
        print("\n🔐 Testing Password Recovery Endpoints...")
        
        # Test 1: POST /api/auth/forgot-password with valid email (should return 503 if SMTP not configured)
        valid_email_data = {"email": "catastro@asomunicipios.gov.co"}
        success, response = self.run_test(
            "Forgot password with valid email",
            "POST",
            "auth/forgot-password",
            503,  # Expected 503 since SMTP is not configured
            data=valid_email_data
        )
        
        if not success:
            # If it doesn't return 503, check if it returns 200 (SMTP might be configured)
            success, response = self.run_test(
                "Forgot password with valid email (SMTP configured)",
                "POST", 
                "auth/forgot-password",
                200,
                data=valid_email_data
            )
        
        # Test 2: POST /api/auth/forgot-password with invalid email (should return 404)
        invalid_email_data = {"email": "nonexistent@test.com"}
        success, response = self.run_test(
            "Forgot password with invalid email",
            "POST",
            "auth/forgot-password", 
            404,
            data=invalid_email_data
        )
        
        # Test 3: GET /api/auth/validate-reset-token with invalid token (should return 404)
        success, response = self.run_test(
            "Validate invalid reset token",
            "GET",
            "auth/validate-reset-token?token=invalid_token_123",
            404
        )
        
        # Test 4: POST /api/auth/reset-password with invalid token (should return 404)
        invalid_reset_data = {
            "token": "invalid_token_123",
            "new_password": "NewPassword123!"
        }
        success, response = self.run_test(
            "Reset password with invalid token",
            "POST",
            "auth/reset-password",
            404,
            data=invalid_reset_data
        )
        
        return True

    def test_dashboard_filtering(self):
        """Test dashboard filtering by status"""
        print("\n📊 Testing Dashboard Filtering...")
        
        if 'admin' not in self.tokens:
            print("❌ No admin token available for dashboard testing")
            return False
            
        # Test getting dashboard stats (this should work for filtering)
        success, response = self.run_test(
            "Get dashboard stats for filtering",
            "GET",
            "petitions/stats/dashboard",
            200,
            token=self.tokens['admin']
        )
        
        if success:
            # Check if response contains expected status counts
            expected_fields = ['total', 'radicado', 'asignado', 'rechazado', 'revision', 'devuelto', 'finalizado']
            has_all_fields = all(field in response for field in expected_fields)
            
            if has_all_fields:
                print(f"   Dashboard stats available:")
                print(f"   - Total: {response['total']}")
                print(f"   - Radicado: {response['radicado']}")
                print(f"   - Finalizado: {response['finalizado']}")
                return True
            else:
                missing_fields = [field for field in expected_fields if field not in response]
                print(f"   ❌ Missing fields in dashboard response: {missing_fields}")
                return False
        
        return False

    def test_petition_creation_with_catalogs(self):
        """Test petition creation with catalog validation"""
        print("\n📝 Testing Petition Creation with Catalogs...")
        
        if 'admin' not in self.tokens:
            print("❌ No admin token available for petition creation testing")
            return False
        
        # Test with valid catalog values
        valid_petition_data = {
            "nombre_completo": "María González Catálogo",
            "correo": "maria.gonzalez@test.com",
            "telefono": "3001234567",
            "tipo_tramite": "Mutación Primera",  # Should be one of the 10 valid options
            "municipio": "Ábrego"  # Should be one of the 12 valid municipalities
        }
        
        success, response = self.run_test(
            "Create petition with valid catalog values",
            "POST",
            "petitions",
            200,
            data=valid_petition_data,
            token=self.tokens['admin'],
            form_data=True
        )
        
        if success and 'id' in response:
            print(f"   Created petition with radicado: {response.get('radicado', 'Unknown')}")
            
            # Verify the petition was created with correct catalog values
            petition_id = response['id']
            success, petition_detail = self.run_test(
                "Verify petition catalog values",
                "GET",
                f"petitions/{petition_id}",
                200,
                token=self.tokens['admin']
            )
            
            if success:
                if (petition_detail.get('tipo_tramite') == valid_petition_data['tipo_tramite'] and
                    petition_detail.get('municipio') == valid_petition_data['municipio']):
                    print(f"   ✅ Catalog values correctly stored")
                    return True
                else:
                    print(f"   ❌ Catalog values not stored correctly")
                    print(f"   Expected: {valid_petition_data['tipo_tramite']}, {valid_petition_data['municipio']}")
                    print(f"   Got: {petition_detail.get('tipo_tramite')}, {petition_detail.get('municipio')}")
                    return False
        
        return False

    def test_file_upload_in_documents_section(self):
        """Test file upload functionality (moved to documents section)"""
        print("\n📎 Testing File Upload in Documents Section...")
        
        if 'admin' not in self.tokens:
            print("❌ No admin token available for file upload testing")
            return False
        
        # First create a petition to upload files to
        petition_data = {
            "nombre_completo": "Pedro Martínez Upload",
            "correo": "pedro.martinez@test.com",
            "telefono": "3001234567", 
            "tipo_tramite": "Certificado catastral",
            "municipio": "Convención"
        }
        
        success, response = self.run_test(
            "Create petition for file upload test",
            "POST",
            "petitions",
            200,
            data=petition_data,
            token=self.tokens['admin'],
            form_data=True
        )
        
        if success and 'id' in response:
            petition_id = response['id']
            print(f"   Created test petition: {response.get('radicado', 'Unknown')}")
            
            # Test file upload by admin (staff) - this should add metadata
            upload_success, upload_result = self.test_file_upload_by_staff('admin', petition_id)
            
            if upload_success:
                print(f"   ✅ File upload functionality working correctly")
                return True
            else:
                print(f"   ❌ File upload failed")
                return False
        
        return False

def main():
    print("🚀 Starting Cadastral Management System API Tests")
    print("=" * 60)
    
    tester = CatastralAPITester()
    
    # Test with specific credentials provided by user
    print("\n👤 Testing Authentication with Provided Credentials...")
    
    # Test admin login
    admin_success = tester.test_login_with_credentials(
        "catastro@asomunicipios.gov.co", 
        "Asm*123*", 
        "admin"
    )
    
    # Test citizen login  
    citizen_success = tester.test_login_with_credentials(
        "ciudadano.prueba@test.com",
        "Test123!",
        "citizen"
    )
    
    if not admin_success:
        print("❌ Admin login failed, cannot continue with most tests")
        return 1
        
    if not citizen_success:
        print("⚠️ Citizen login failed, but continuing with admin tests")
    
    # NEW FUNCTIONALITY TESTS - As requested in review
    print("\n🆕 Testing New Functionalities...")
    
    # Test 1: Password Recovery Endpoints
    tester.test_password_recovery_endpoints()
    
    # Test 2: Dashboard Filtering
    tester.test_dashboard_filtering()
    
    # Test 3: Petition Creation with Catalogs
    tester.test_petition_creation_with_catalogs()
    
    # Test 4: File Upload in Documents Section
    tester.test_file_upload_in_documents_section()
    
    # Test file operations with the specific petition mentioned
    print("\n📁 Testing File Upload and Download Operations...")
    
    # Test file upload by admin (staff)
    test_petition_id = "RASMCG-0006-06-01-2026"
    
    # First check if petition exists
    success, petition_data = tester.run_test(
        "Get test petition",
        "GET",
        f"petitions/{test_petition_id}",
        200,
        token=tester.tokens.get('admin')
    )
    
    if success:
        print(f"   Found petition: {petition_data.get('radicado', 'Unknown')}")
        
        # Test file upload by admin
        upload_success, upload_result = tester.test_file_upload_by_staff('admin', test_petition_id)
        
        # Test ZIP download
        if upload_success:
            download_success = tester.test_download_citizen_zip('admin', test_petition_id)
        else:
            print("⚠️ Skipping ZIP download test due to upload failure")
            
    else:
        print(f"❌ Test petition {test_petition_id} not found")
        print("   Creating a new petition for testing...")
        
        # Create a new petition as citizen if available
        if citizen_success:
            petition_data = {
                "nombre_completo": "Juan Pérez Ciudadano",
                "correo": "ciudadano.prueba@test.com", 
                "telefono": "3001234567",
                "tipo_tramite": "Certificado catastral",
                "municipio": "Ábrego"
            }
            
            success, response = tester.run_test(
                "Create test petition",
                "POST",
                "petitions",
                200,
                data=petition_data,
                token=tester.tokens['citizen'],
                form_data=True
            )
            
            if success and 'id' in response:
                new_petition_id = response['id']
                print(f"   Created petition: {response.get('radicado', 'Unknown')}")
                
                # Test file upload by admin on new petition
                upload_success, upload_result = tester.test_file_upload_by_staff('admin', new_petition_id)
                
                # Test ZIP download
                if upload_success:
                    download_success = tester.test_download_citizen_zip('admin', new_petition_id)
    
    # Test user registration for additional roles if needed
    roles = ['ciudadano', 'atencion_usuario', 'coordinador']
    
    print("\n👤 Testing User Registration & Authentication...")
    for role in roles:
        if not tester.test_user_registration(role):
            print(f"⚠️ Registration failed for {role}, but continuing")
    
    # Test login for registered users
    for role in roles:
        if not tester.test_user_login(role):
            print(f"⚠️ Login failed for {role}")
    
    # Test getting current user
    for role in roles:
        if role in tester.tokens:
            if not tester.test_get_current_user(role):
                print(f"⚠️ Get current user failed for {role}")
    
    print("\n📝 Testing Petition Management...")
    
    # Test creating petitions (all roles should be able to create)
    for role in roles:
        if role in tester.tokens:
            if not tester.test_create_petition(role):
                print(f"⚠️ Create petition failed for {role}")
    
    # Test getting petitions (role-based access)
    for role in roles:
        if role in tester.tokens:
            if not tester.test_get_petitions(role):
                print(f"⚠️ Get petitions failed for {role}")
    
    # Test dashboard stats
    print("\n📊 Testing Dashboard Statistics...")
    for role in roles:
        if role in tester.tokens:
            if not tester.test_dashboard_stats(role):
                print(f"⚠️ Dashboard stats failed for {role}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())