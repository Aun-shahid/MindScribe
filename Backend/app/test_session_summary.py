"""
Test script for Session Summary feature
Run this after creating test users and a session
"""
import json


def _get_requests_module():
    """Import requests lazily so this script doesn't break Django test discovery."""
    try:
        import requests  # type: ignore
    except ImportError as exc:
        raise RuntimeError("Install 'requests' to run test_session_summary.py") from exc
    return requests

# Configuration
BASE_URL = "http://localhost:8000/api/therapy-sessions"
THERAPIST_TOKEN = "YOUR_THERAPIST_TOKEN"  # Replace with actual token
PATIENT_TOKEN = "YOUR_PATIENT_TOKEN"      # Replace with actual token

# Test session ID (replace with actual session ID)
SESSION_ID = "YOUR_SESSION_ID"

def test_therapist_write_summary():
    """Test therapist writing session summary"""
    print("\n=== Test 1: Therapist Writing Session Summary ===")
    
    url = f"{BASE_URL}/sessions/{SESSION_ID}/summary/"
    headers = {
        "Authorization": f"Bearer {THERAPIST_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "session_summary": "We worked on anxiety management techniques. Patient showed great progress with breathing exercises. Continue practicing daily mindfulness for 10 minutes.",
        "patient_goals": "Practice breathing exercises daily",
        "homework_assigned": "Complete 10-minute daily mindfulness practice",
        "next_session_goals": "Review progress and introduce cognitive restructuring techniques"
    }
    
    requests = _get_requests_module()
    response = requests.patch(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200


def test_patient_view_summary():
    """Test patient viewing session summary"""
    print("\n=== Test 2: Patient Viewing Session Summary ===")
    
    url = f"{BASE_URL}/sessions/past/"
    headers = {
        "Authorization": f"Bearer {PATIENT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    requests = _get_requests_module()
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Total Sessions: {data.get('count', 0)}")
        
        if data.get('results'):
            session = data['results'][0]
            print(f"\nFirst Session:")
            print(f"  Session Number: {session.get('session_number')}")
            print(f"  Session Summary: {session.get('session_summary', 'N/A')}")
            print(f"  Summary Written At: {session.get('summary_written_at', 'N/A')}")
            print(f"  Patient Goals: {session.get('patient_goals', 'N/A')}")
            print(f"  Homework: {session.get('homework_assigned', 'N/A')}")
            
            # Verify private notes are NOT visible
            has_private_notes = 'session_notes' in session
            print(f"\n  Private Notes Visible: {has_private_notes} (should be False)")
            
            return not has_private_notes
    
    return False


def test_patient_cannot_write_summary():
    """Test that patient cannot write session summary"""
    print("\n=== Test 3: Patient Cannot Write Summary (Security Test) ===")
    
    url = f"{BASE_URL}/sessions/{SESSION_ID}/summary/"
    headers = {
        "Authorization": f"Bearer {PATIENT_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "session_summary": "This should not work!"
    }
    
    requests = _get_requests_module()
    response = requests.patch(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Should return 403 Forbidden or 404 Not Found
    return response.status_code in [403, 404]


def test_summary_for_scheduled_session():
    """Test that summary cannot be written for scheduled/upcoming sessions"""
    print("\n=== Test 4: Cannot Write Summary for Scheduled Session ===")
    
    # You'll need to replace with a scheduled session ID
    scheduled_session_id = "YOUR_SCHEDULED_SESSION_ID"
    
    url = f"{BASE_URL}/sessions/{scheduled_session_id}/summary/"
    headers = {
        "Authorization": f"Bearer {THERAPIST_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "session_summary": "This should fail!"
    }
    
    requests = _get_requests_module()
    response = requests.patch(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Should return 400 Bad Request
    return response.status_code == 400


if __name__ == "__main__":
    print("=" * 60)
    print("Session Summary Feature Test Suite")
    print("=" * 60)
    
    # Run tests
    results = []
    
    try:
        results.append(("Therapist Write Summary", test_therapist_write_summary()))
        results.append(("Patient View Summary", test_patient_view_summary()))
        results.append(("Patient Cannot Write", test_patient_cannot_write_summary()))
        # results.append(("No Summary for Scheduled", test_summary_for_scheduled_session()))
    except Exception as e:
        print(f"\nError during testing: {e}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
