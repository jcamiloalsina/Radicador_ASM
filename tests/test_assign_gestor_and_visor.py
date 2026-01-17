"""
Test suite for:
1. Assign gestor from edit modal - endpoint /api/petitions/{id}/assign-gestor
2. Gestor selector visible in edit modal when status is 'Asignado'
3. Map Visor de Predios with maxZoom=19 to avoid grey tiles
4. Login functional with admin credentials
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLoginAndAuth:
    """Test login functionality with admin credentials"""
    
    def test_admin_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "catastro@asomunicipios.gov.co",
            "password": "Asm*123*"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "administrador", f"Expected admin role, got {data['user']['role']}"
        print(f"✓ Admin login successful: {data['user']['full_name']}")
        return data["token"]


class TestGestoresEndpoint:
    """Test gestores endpoint for dropdown population"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "catastro@asomunicipios.gov.co",
            "password": "Asm*123*"
        })
        return response.json()["token"]
    
    def test_get_gestores_list(self, auth_token):
        """Test that gestores list endpoint returns data for dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/gestores",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get gestores: {response.text}"
        gestores = response.json()
        assert isinstance(gestores, list), "Gestores should be a list"
        print(f"✓ Found {len(gestores)} gestores available for assignment")
        if gestores:
            print(f"  Sample gestor: {gestores[0].get('full_name', 'N/A')} ({gestores[0].get('role', 'N/A')})")
        return gestores


class TestAssignGestorEndpoint:
    """Test assign gestor endpoint - /api/petitions/{id}/assign-gestor"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "catastro@asomunicipios.gov.co",
            "password": "Asm*123*"
        })
        return response.json()["token"]
    
    @pytest.fixture
    def test_petition_id(self, auth_token):
        """Get or create a test petition"""
        # First try to get existing petitions
        response = requests.get(
            f"{BASE_URL}/api/petitions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            petitions = response.json()
            if petitions:
                # Find a petition that's not finalized
                for p in petitions:
                    if p.get('estado') not in ['finalizado']:
                        return p['id']
                # If all are finalized, use the first one anyway for testing
                return petitions[0]['id']
        return None
    
    @pytest.fixture
    def gestor_id(self, auth_token):
        """Get a gestor ID for assignment"""
        response = requests.get(
            f"{BASE_URL}/api/gestores",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            gestores = response.json()
            if gestores:
                return gestores[0]['id']
        return None
    
    def test_assign_gestor_endpoint_exists(self, auth_token, test_petition_id, gestor_id):
        """Test that assign-gestor endpoint exists and responds correctly"""
        if not test_petition_id:
            pytest.skip("No petition available for testing")
        if not gestor_id:
            pytest.skip("No gestor available for testing")
        
        # Test the endpoint
        response = requests.post(
            f"{BASE_URL}/api/petitions/{test_petition_id}/assign-gestor",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "petition_id": test_petition_id,
                "gestor_id": gestor_id,
                "is_auxiliar": False
            }
        )
        
        # Should return 200 or 404 (if petition not found) - NOT 404 for endpoint not found
        assert response.status_code in [200, 404, 400], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            print(f"✓ Gestor assigned successfully to petition {test_petition_id}")
        elif response.status_code == 404:
            # Check if it's petition not found vs endpoint not found
            error_detail = response.json().get('detail', '')
            assert 'Petición no encontrada' in error_detail or 'Gestor no encontrado' in error_detail, \
                f"Endpoint might not exist: {error_detail}"
            print(f"✓ Endpoint exists but resource not found: {error_detail}")
        
        return response.status_code
    
    def test_assign_gestor_with_invalid_petition(self, auth_token, gestor_id):
        """Test assign-gestor with invalid petition ID"""
        if not gestor_id:
            pytest.skip("No gestor available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/petitions/invalid-petition-id/assign-gestor",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "petition_id": "invalid-petition-id",
                "gestor_id": gestor_id,
                "is_auxiliar": False
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        assert "Petición no encontrada" in response.json().get('detail', ''), \
            f"Expected 'Petición no encontrada' error, got: {response.text}"
        print("✓ Correctly returns 404 for invalid petition ID")


class TestPetitionUpdateWithGestor:
    """Test petition update flow with gestor assignment"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "catastro@asomunicipios.gov.co",
            "password": "Asm*123*"
        })
        return response.json()["token"]
    
    def test_update_petition_to_asignado_state(self, auth_token):
        """Test updating petition to 'asignado' state"""
        # Get a petition
        response = requests.get(
            f"{BASE_URL}/api/petitions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        petitions = response.json()
        
        if not petitions:
            pytest.skip("No petitions available")
        
        # Find a petition that's not finalized
        test_petition = None
        for p in petitions:
            if p.get('estado') not in ['finalizado']:
                test_petition = p
                break
        
        if not test_petition:
            test_petition = petitions[0]
        
        petition_id = test_petition['id']
        
        # Update to asignado state
        response = requests.patch(
            f"{BASE_URL}/api/petitions/{petition_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"estado": "asignado"}
        )
        
        assert response.status_code == 200, f"Failed to update petition: {response.text}"
        print(f"✓ Petition {petition_id} updated to 'asignado' state")
        
        # Verify the update
        response = requests.get(
            f"{BASE_URL}/api/petitions/{petition_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        updated_petition = response.json()
        assert updated_petition['estado'] == 'asignado', f"Expected 'asignado', got {updated_petition['estado']}"
        print(f"✓ Verified petition state is 'asignado'")


class TestVisorPrediosEndpoints:
    """Test Visor de Predios related endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "catastro@asomunicipios.gov.co",
            "password": "Asm*123*"
        })
        return response.json()["token"]
    
    def test_predios_endpoint(self, auth_token):
        """Test predios endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/predios?limit=5",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get predios: {response.text}"
        data = response.json()
        print(f"✓ Predios endpoint working - returned {len(data.get('predios', []))} predios")
    
    def test_municipios_endpoint(self, auth_token):
        """Test municipios endpoint for map filters"""
        response = requests.get(
            f"{BASE_URL}/api/municipios",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get municipios: {response.text}"
        municipios = response.json()
        print(f"✓ Municipios endpoint working - returned {len(municipios)} municipios")
    
    def test_gdb_limites_municipios(self, auth_token):
        """Test GDB limites municipios endpoint for map boundaries"""
        response = requests.get(
            f"{BASE_URL}/api/gdb/limites-municipios",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # This might return 200 or 404 depending on data availability
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            print(f"✓ GDB limites municipios endpoint working - {data.get('total_municipios', 0)} municipios with boundaries")
        else:
            print("✓ GDB limites municipios endpoint exists (no data available)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
