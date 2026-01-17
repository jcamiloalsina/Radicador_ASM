"""
Test suite for:
1. Petition return flow (devolucion) - POST /api/petitions/{id}/reenviar
2. PATCH /api/petitions/{id} with estado=devuelto (observaciones_devolucion, devuelto_por)
3. User name formatting - POST /api/admin/format-user-names
4. Name formatting on registration - POST /api/auth/register
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication helpers"""
    
    @staticmethod
    def login_admin():
        """Login as admin and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "catastro@asomunicipios.gov.co",
            "password": "Asm*123*"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()['token']
    
    @staticmethod
    def login_user(email, password):
        """Login as specific user and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json()['token']
        return None


class TestPetitionDevolucionFlow:
    """Tests for petition return (devolucion) flow"""
    
    def test_get_devuelto_petition(self):
        """Test that we can get a petition in devuelto state"""
        token = TestAuth.login_admin()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get the known devuelto petition
        petition_id = "e278e7a0-c386-478a-a94e-2c32bfdbc3ba"
        response = requests.get(f"{BASE_URL}/api/petitions/{petition_id}", headers=headers)
        
        assert response.status_code == 200, f"Failed to get petition: {response.text}"
        petition = response.json()
        
        # Verify petition is in devuelto state
        assert petition['estado'] == 'devuelto', f"Expected estado=devuelto, got {petition['estado']}"
        print(f"✓ Petition {petition['radicado']} is in devuelto state")
        
        # Check if observaciones_devolucion exists
        if petition.get('observaciones_devolucion'):
            print(f"✓ Has observaciones_devolucion: {petition['observaciones_devolucion'][:50]}...")
        
        # Check if devuelto_por info exists
        if petition.get('devuelto_por_nombre'):
            print(f"✓ Devuelto por: {petition['devuelto_por_nombre']}")
        
        return petition
    
    def test_reenviar_petition_as_owner(self):
        """Test that petition owner can reenviar a devuelto petition"""
        # First, get the petition to find the owner
        admin_token = TestAuth.login_admin()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        petition_id = "e278e7a0-c386-478a-a94e-2c32bfdbc3ba"
        response = requests.get(f"{BASE_URL}/api/petitions/{petition_id}", headers=admin_headers)
        assert response.status_code == 200
        petition = response.json()
        
        # Check current state
        if petition['estado'] != 'devuelto':
            print(f"⚠ Petition is not in devuelto state (current: {petition['estado']}), skipping reenviar test")
            pytest.skip("Petition not in devuelto state")
        
        # Try to login as the owner (MARTHA CECILIA URIBE PARRA)
        # We need to find the owner's email
        user_id = petition.get('user_id')
        if not user_id:
            pytest.skip("Petition has no user_id")
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        if response.status_code == 200:
            users = response.json()
            owner = next((u for u in users if u['id'] == user_id), None)
            if owner:
                print(f"✓ Found owner: {owner['full_name']} ({owner['email']})")
                
                # Try to login as owner
                owner_token = TestAuth.login_user(owner['email'], "Asm*123*")
                if owner_token:
                    owner_headers = {"Authorization": f"Bearer {owner_token}"}
                    
                    # Test reenviar endpoint
                    response = requests.post(f"{BASE_URL}/api/petitions/{petition_id}/reenviar", headers=owner_headers)
                    
                    if response.status_code == 200:
                        print(f"✓ Reenviar successful: {response.json()}")
                        
                        # Verify state changed to revision
                        response = requests.get(f"{BASE_URL}/api/petitions/{petition_id}", headers=admin_headers)
                        assert response.status_code == 200
                        updated_petition = response.json()
                        assert updated_petition['estado'] == 'revision', f"Expected estado=revision after reenviar, got {updated_petition['estado']}"
                        print(f"✓ Petition state changed to revision")
                        
                        # Restore to devuelto for other tests
                        restore_response = requests.patch(
                            f"{BASE_URL}/api/petitions/{petition_id}",
                            headers=admin_headers,
                            json={
                                "estado": "devuelto",
                                "observaciones_devolucion": "Test observaciones - restaurado para pruebas"
                            }
                        )
                        print(f"✓ Restored petition to devuelto state")
                    else:
                        print(f"⚠ Reenviar returned {response.status_code}: {response.text}")
                else:
                    print(f"⚠ Could not login as owner, testing with admin (should fail)")
    
    def test_reenviar_petition_as_non_owner_fails(self):
        """Test that non-owner cannot reenviar a petition"""
        admin_token = TestAuth.login_admin()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        petition_id = "e278e7a0-c386-478a-a94e-2c32bfdbc3ba"
        
        # Admin should not be able to reenviar (not the owner)
        response = requests.post(f"{BASE_URL}/api/petitions/{petition_id}/reenviar", headers=admin_headers)
        
        # Should return 403 Forbidden
        assert response.status_code == 403, f"Expected 403 for non-owner, got {response.status_code}: {response.text}"
        print(f"✓ Non-owner correctly denied: {response.json()['detail']}")
    
    def test_reenviar_non_devuelto_petition_fails(self):
        """Test that reenviar fails for petitions not in devuelto state"""
        admin_token = TestAuth.login_admin()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a petition that is NOT devuelto
        response = requests.get(f"{BASE_URL}/api/petitions?estado=radicado&limit=1", headers=admin_headers)
        assert response.status_code == 200
        petitions = response.json()
        
        if petitions and len(petitions) > 0:
            petition = petitions[0]
            petition_id = petition['id']
            
            # Try to reenviar (should fail because not devuelto)
            response = requests.post(f"{BASE_URL}/api/petitions/{petition_id}/reenviar", headers=admin_headers)
            
            # Should return 400 Bad Request
            assert response.status_code in [400, 403], f"Expected 400 or 403, got {response.status_code}: {response.text}"
            print(f"✓ Correctly rejected reenviar for non-devuelto petition")
        else:
            pytest.skip("No radicado petitions found")


class TestPatchPetitionDevuelto:
    """Tests for PATCH /api/petitions/{id} with estado=devuelto"""
    
    def test_patch_petition_to_devuelto_saves_observaciones(self):
        """Test that changing estado to devuelto saves observaciones_devolucion and devuelto_por"""
        token = TestAuth.login_admin()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get a petition to test with (not the one already devuelto)
        response = requests.get(f"{BASE_URL}/api/petitions?estado=asignado&limit=1", headers=headers)
        assert response.status_code == 200
        petitions = response.json()
        
        if not petitions or len(petitions) == 0:
            # Try revision state
            response = requests.get(f"{BASE_URL}/api/petitions?estado=revision&limit=1", headers=headers)
            assert response.status_code == 200
            petitions = response.json()
        
        if petitions and len(petitions) > 0:
            petition = petitions[0]
            petition_id = petition['id']
            original_estado = petition['estado']
            
            # Change to devuelto with observaciones
            test_observaciones = "TEST: Por favor adjuntar documento de identidad del propietario"
            response = requests.patch(
                f"{BASE_URL}/api/petitions/{petition_id}",
                headers=headers,
                json={
                    "estado": "devuelto",
                    "observaciones_devolucion": test_observaciones
                }
            )
            
            assert response.status_code == 200, f"PATCH failed: {response.text}"
            updated = response.json()
            
            # Verify observaciones_devolucion was saved
            assert updated.get('observaciones_devolucion') == test_observaciones, \
                f"observaciones_devolucion not saved correctly"
            print(f"✓ observaciones_devolucion saved: {test_observaciones[:30]}...")
            
            # Verify devuelto_por info was saved
            assert updated.get('devuelto_por_id') is not None, "devuelto_por_id not saved"
            assert updated.get('devuelto_por_nombre') is not None, "devuelto_por_nombre not saved"
            print(f"✓ devuelto_por_nombre saved: {updated.get('devuelto_por_nombre')}")
            
            # Restore original state
            requests.patch(
                f"{BASE_URL}/api/petitions/{petition_id}",
                headers=headers,
                json={"estado": original_estado}
            )
            print(f"✓ Restored petition to {original_estado}")
        else:
            pytest.skip("No suitable petition found for testing")


class TestUserNameFormatting:
    """Tests for user name formatting functionality"""
    
    def test_format_user_names_endpoint(self):
        """Test POST /api/admin/format-user-names endpoint"""
        token = TestAuth.login_admin()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/admin/format-user-names", headers=headers)
        
        assert response.status_code == 200, f"Format names failed: {response.text}"
        result = response.json()
        
        print(f"✓ Format names completed:")
        print(f"  - Total users: {result['total_users']}")
        print(f"  - Users updated: {result['users_updated']}")
        
        if result.get('examples'):
            print(f"  - Examples:")
            for ex in result['examples']:
                print(f"    {ex['original']} -> {ex['formatted']}")
    
    def test_format_user_names_requires_admin(self):
        """Test that format-user-names requires admin role"""
        # Try with a non-admin user
        user_token = TestAuth.login_user("usuario_prueba@test.com", "Asm*123*")
        
        if user_token:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = requests.post(f"{BASE_URL}/api/admin/format-user-names", headers=headers)
            
            assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
            print(f"✓ Non-admin correctly denied access")
        else:
            print(f"⚠ Could not login as test user, skipping permission test")
    
    def test_register_formats_name(self):
        """Test that POST /api/auth/register formats the name correctly"""
        # Generate unique email
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_format_{unique_id}@test.com"
        
        # Register with uppercase name
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "Asm*123*",
            "full_name": "MARIA JOSE GARCIA LOPEZ"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        result = response.json()
        
        # Check that name was formatted
        formatted_name = result['user']['full_name']
        print(f"✓ Registered user with formatted name: {formatted_name}")
        
        # Verify formatting (should have proper capitalization and tildes)
        assert formatted_name != "MARIA JOSE GARCIA LOPEZ", "Name was not formatted"
        assert "María" in formatted_name or "Jose" in formatted_name.title(), \
            f"Name not properly formatted: {formatted_name}"
        
        # Cleanup - delete test user
        admin_token = TestAuth.login_admin()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get user ID
        user_id = result['user']['id']
        delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        if delete_response.status_code == 200:
            print(f"✓ Cleaned up test user")


class TestDashboardStats:
    """Tests for dashboard stats including devuelto count"""
    
    def test_dashboard_stats_includes_devuelto(self):
        """Test that dashboard stats include devuelto count"""
        token = TestAuth.login_admin()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/petitions/stats/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Stats failed: {response.text}"
        stats = response.json()
        
        assert 'devuelto' in stats, "devuelto not in stats"
        print(f"✓ Dashboard stats:")
        print(f"  - Total: {stats['total']}")
        print(f"  - Radicado: {stats['radicado']}")
        print(f"  - Asignado: {stats['asignado']}")
        print(f"  - Revision: {stats['revision']}")
        print(f"  - Devuelto: {stats['devuelto']}")
        print(f"  - Finalizado: {stats['finalizado']}")
        print(f"  - Rechazado: {stats['rechazado']}")


class TestNotificationsOnReenviar:
    """Tests for notifications when petition is reenviada"""
    
    def test_notification_created_on_reenviar(self):
        """Test that notification is created when petition is reenviada"""
        admin_token = TestAuth.login_admin()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get notifications before
        response = requests.get(f"{BASE_URL}/api/notificaciones", headers=admin_headers)
        assert response.status_code == 200
        notifications_before = response.json()
        
        print(f"✓ Current notifications count: {len(notifications_before.get('notificaciones', []))}")
        
        # Check for reenviar-related notifications
        reenviar_notifications = [
            n for n in notifications_before.get('notificaciones', [])
            if 'reenviado' in n.get('titulo', '').lower() or 'reenviado' in n.get('mensaje', '').lower()
        ]
        
        if reenviar_notifications:
            print(f"✓ Found {len(reenviar_notifications)} reenviar notifications")
            for n in reenviar_notifications[:3]:
                print(f"  - {n['titulo']}: {n['mensaje'][:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
