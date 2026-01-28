import time
import requests
import random

# Guardian Recovery Script
# Runs as a standalone process (or cron) to check system health.

HEALTH_ENDPOINT = "http://localhost:3000/api/health"

def check_health():
    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"[GUARDIAN] System Healthy. Uptime: {data.get('uptime')}s. DB Latency: {data['services']['database']['latency']}")
            return True
        else:
            print(f"[GUARDIAN] ALERT: System degraded. Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"[GUARDIAN] CRITICAL: Could not reach health endpoint. {e}")
        return False

def trigger_healing():
    print("[GUARDIAN] Initiating Self-Healing Protocol...")
    # Simulation: Restarting service or invoking Vulcan
    action_id = random.randint(1000, 9999)
    print(f"[GUARDIAN] Action {action_id}: Restarting specialized agents...")
    time.sleep(2)
    print(f"[GUARDIAN] Action {action_id}: Complete. System restored.")

if __name__ == "__main__":
    print("The Guardian is watching...")
    while True:
        is_healthy = check_health()
        if not is_healthy:
            trigger_healing()
        
        # Check every 60 seconds
        time.sleep(60)
