"""
Test Suite for Usuario Role Rename and Histórico de Trámites Features
Tests:
1. UserRole.USUARIO is correctly defined (renamed from 'ciudadano')
2. New user registration assigns 'usuario' role
3. Export Excel endpoint for coordinators/admins
4. Advanced filters for petitions
5. User management shows 'Usuario' role correctly
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "catastro@asomunicipios.gov.co"
ADMIN_PASSWORD = "Asm*123*"
TEST_USER_EMAIL = f"test_usuario_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
TEST_USER_PASSWORD = "Test*123*"
TEST_USER_NAME = "Test Usuario Role"


class TestUserRoleRename:
    """Tests for verifying 'ciudadano' was renamed to 'usuario'"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_01_register_new_user_gets_usuario_role(self):
        """Test that new user registration assigns 'usuario' role (not 'ciudadano')"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify role is 'usuario' not 'ciudadano'
        assert "user" in data, "Response should contain user data"
        assert data["user"]["role"] == "usuario", f"Expected role 'usuario', got '{data['user']['role']}'"
        assert data["user"]["role"] != "ciudadano", "Role should NOT be 'ciudadano'"
        
        # Store token for later tests
        self.__class__.test_user_token = data["token"]
        self.__class__.test_user_id = data["user"]["id"]
        print(f"✓ New user registered with role: {data['user']['role']}")
    
    def test_02_get_me_returns_usuario_role(self):
        """Test that /auth/me returns 'usuario' role for new user"""
        token = getattr(self.__class__, 'test_user_token', None)
        if not token:
            pytest.skip("No test user token available")
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        
        assert data["role"] == "usuario", f"Expected role 'usuario', got '{data['role']}'"
        print(f"✓ /auth/me returns role: {data['role']}")
    
    def test_03_users_list_shows_usuario_role(self, admin_token):
        """Test that users list shows 'usuario' role correctly"""
        response = requests.get(f"{BASE_URL}/api/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Get users failed: {response.text}"
        users = response.json()
        
        # Find users with 'usuario' role
        usuario_users = [u for u in users if u.get('role') == 'usuario']
        ciudadano_users = [u for u in users if u.get('role') == 'ciudadano']
        
        assert len(ciudadano_users) == 0, f"Found {len(ciudadano_users)} users with 'ciudadano' role - should be 0"
        print(f"✓ Found {len(usuario_users)} users with 'usuario' role, 0 with 'ciudadano'")
    
    def test_04_role_update_accepts_usuario(self, admin_token):
        """Test that role update endpoint accepts 'usuario' as valid role"""
        test_user_id = getattr(self.__class__, 'test_user_id', None)
        if not test_user_id:
            pytest.skip("No test user ID available")
        
        # Try to update role to 'usuario' (should work)
        response = requests.patch(f"{BASE_URL}/api/users/role", 
            json={
                "user_id": test_user_id,
                "new_role": "usuario"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Role update failed: {response.text}"
        data = response.json()
        assert data["new_role"] == "usuario", f"Expected new_role 'usuario', got '{data['new_role']}'"
        print(f"✓ Role update to 'usuario' successful")


class TestHistoricoTramites:
    """Tests for Histórico de Trámites features (advanced filters and Excel export)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def coordinator_token(self):
        """Get coordinator token (admin has coordinator privileges)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_01_get_all_petitions(self, admin_token):
        """Test that admin can get all petitions"""
        response = requests.get(f"{BASE_URL}/api/petitions", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Get petitions failed: {response.text}"
        petitions = response.json()
        
        assert isinstance(petitions, list), "Response should be a list"
        print(f"✓ Retrieved {len(petitions)} petitions")
    
    def test_02_export_excel_endpoint_exists(self, admin_token):
        """Test that Excel export endpoint exists and is accessible for admin"""
        response = requests.get(f"{BASE_URL}/api/reports/tramites/export-excel", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        # Should return 200 with Excel file or empty result
        assert response.status_code == 200, f"Export Excel failed: {response.status_code} - {response.text}"
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type or 'octet-stream' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        print(f"✓ Excel export endpoint working, content-type: {content_type}")
    
    def test_03_export_excel_with_filters(self, admin_token):
        """Test Excel export with various filters"""
        # Test with estado filter
        response = requests.get(
            f"{BASE_URL}/api/reports/tramites/export-excel?estado=radicado", 
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export with estado filter failed: {response.text}"
        print("✓ Excel export with estado filter works")
        
        # Test with municipio filter
        response = requests.get(
            f"{BASE_URL}/api/reports/tramites/export-excel?municipio=Ábrego", 
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export with municipio filter failed: {response.text}"
        print("✓ Excel export with municipio filter works")
        
        # Test with date filters
        response = requests.get(
            f"{BASE_URL}/api/reports/tramites/export-excel?fecha_desde=2024-01-01&fecha_hasta=2025-12-31", 
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Export with date filters failed: {response.text}"
        print("✓ Excel export with date filters works")
    
    def test_04_export_excel_forbidden_for_usuario(self):
        """Test that 'usuario' role cannot access Excel export"""
        # First register a test user
        test_email = f"test_forbidden_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "Test*123*",
            "full_name": "Test Forbidden User"
        })
        
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        user_token = reg_response.json()["token"]
        
        # Try to access Excel export
        response = requests.get(f"{BASE_URL}/api/reports/tramites/export-excel", headers={
            "Authorization": f"Bearer {user_token}"
        })
        
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print("✓ Excel export correctly forbidden for 'usuario' role")
    
    def test_05_get_gestores_list(self, admin_token):
        """Test that gestores list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/gestores", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Get gestores failed: {response.text}"
        gestores = response.json()
        
        assert isinstance(gestores, list), "Response should be a list"
        print(f"✓ Retrieved {len(gestores)} gestores")


class TestDashboardStats:
    """Tests for dashboard statistics"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_01_dashboard_stats(self, admin_token):
        """Test dashboard statistics endpoint"""
        response = requests.get(f"{BASE_URL}/api/petitions/stats/dashboard", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        stats = response.json()
        
        # Verify expected fields
        expected_fields = ['total', 'radicado', 'asignado', 'rechazado', 'revision', 'devuelto', 'finalizado']
        for field in expected_fields:
            assert field in stats, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: total={stats['total']}, radicado={stats['radicado']}, finalizado={stats['finalizado']}")


class TestUserManagement:
    """Tests for user management functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_01_get_users_list(self, admin_token):
        """Test getting users list"""
        response = requests.get(f"{BASE_URL}/api/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Get users failed: {response.text}"
        users = response.json()
        
        assert isinstance(users, list), "Response should be a list"
        assert len(users) > 0, "Should have at least one user"
        
        # Check user structure
        user = users[0]
        assert 'id' in user, "User should have id"
        assert 'email' in user, "User should have email"
        assert 'full_name' in user, "User should have full_name"
        assert 'role' in user, "User should have role"
        
        print(f"✓ Retrieved {len(users)} users")
    
    def test_02_valid_roles_in_system(self, admin_token):
        """Test that all roles in system are valid (no 'ciudadano')"""
        response = requests.get(f"{BASE_URL}/api/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200
        users = response.json()
        
        valid_roles = ['usuario', 'atencion_usuario', 'gestor', 'coordinador', 'administrador', 'comunicaciones']
        
        for user in users:
            role = user.get('role', '')
            assert role in valid_roles, f"Invalid role '{role}' for user {user.get('email')}"
            assert role != 'ciudadano', f"Found deprecated 'ciudadano' role for user {user.get('email')}"
        
        print(f"✓ All {len(users)} users have valid roles (no 'ciudadano' found)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
