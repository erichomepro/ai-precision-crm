import time
import schedule

def job():
    print("The Watchman: Checking agent status...")
    # Logic to restart stuck agents or trigger scheduled tasks

schedule.every(10).minutes.do(job)

if __name__ == "__main__":
    print("The Watchman is on duty.")
    while True:
        schedule.run_pending()
        time.sleep(1)
