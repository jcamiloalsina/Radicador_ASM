import requests
import sys
import json
from datetime import datetime

class CatastralAPITester:
    def __init__(self, base_url="https://catastro-gestor.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.users = {}   # Store user data
        self.petitions = {}  # Store created petitions
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
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
            token=self.tokens[role]
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
            required_fields = ['total', 'pendientes', 'en_revision', 'aprobadas', 'rechazadas']
            has_all_fields = all(field in response for field in required_fields)
            if has_all_fields:
                print(f"   Stats: Total={response['total']}, Pendientes={response['pendientes']}")
                return True
            else:
                print(f"   Missing required fields in stats response")
        return False

    def test_role_permissions(self):
        """Test role-based permissions"""
        print("\n🔐 Testing Role-Based Permissions...")
        
        # Create a petition as ciudadano
        if 'ciudadano' in self.petitions and self.petitions['ciudadano']:
            petition_id = self.petitions['ciudadano'][0]
            
            # Test that ciudadano cannot update petitions
            self.test_update_petition('ciudadano', petition_id)
            
            # Test that atencion_usuario can update status/notes
            if 'atencion_usuario' in self.tokens:
                self.test_update_petition('atencion_usuario', petition_id)
            
            # Test that coordinador can update all fields
            if 'coordinador' in self.tokens:
                self.test_update_petition('coordinador', petition_id)

def main():
    print("🚀 Starting Cadastral Management System API Tests")
    print("=" * 60)
    
    tester = CatastralAPITester()
    
    # Test user registration for all roles
    roles = ['ciudadano', 'atencion_usuario', 'coordinador']
    
    print("\n👤 Testing User Registration & Authentication...")
    for role in roles:
        if not tester.test_user_registration(role):
            print(f"❌ Registration failed for {role}, stopping tests")
            return 1
    
    # Test login for all users
    for role in roles:
        if not tester.test_user_login(role):
            print(f"❌ Login failed for {role}")
            return 1
    
    # Test getting current user
    for role in roles:
        if not tester.test_get_current_user(role):
            print(f"❌ Get current user failed for {role}")
    
    print("\n📝 Testing Petition Management...")
    
    # Test creating petitions (all roles should be able to create)
    for role in roles:
        if not tester.test_create_petition(role):
            print(f"❌ Create petition failed for {role}")
    
    # Test getting petitions (role-based access)
    for role in roles:
        if not tester.test_get_petitions(role):
            print(f"❌ Get petitions failed for {role}")
    
    # Test petition details
    for role in roles:
        if role in tester.petitions and tester.petitions[role]:
            petition_id = tester.petitions[role][0]
            if not tester.test_get_petition_detail(role, petition_id):
                print(f"❌ Get petition detail failed for {role}")
    
    # Test dashboard stats
    print("\n📊 Testing Dashboard Statistics...")
    for role in roles:
        if not tester.test_dashboard_stats(role):
            print(f"❌ Dashboard stats failed for {role}")
    
    # Test role-based permissions
    tester.test_role_permissions()
    
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