import os
import time
import requests
import json
import win32print
import configparser
import re
from datetime import datetime

# ==============================================================================
# CONFIGURATION
# ==============================================================================
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'config.ini')

if not os.path.exists(config_path):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: config.ini not found at {config_path}")
    exit(1)

config.read(config_path)

try:
    SUPABASE_URL = config.get('Supabase', 'URL')
    SUPABASE_ANON_KEY = config.get('Supabase', 'ANON_KEY')
    PRINTER_NAME = config.get('Printer', 'PrinterName')
except configparser.NoOptionError as e:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: Missing configuration in config.ini - {e}")
    exit(1)
except configparser.NoSectionError as e:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: Missing section in config.ini - {e}")
    exit(1)

print(f"[{datetime.now().strftime('%H:%M:%S')}] Milenium Telemetry Agent v2.0 (Spooler Interceptor) started.")
print(f"[{datetime.now().strftime('%H:%M:%S')}] Monitoring Printer: {PRINTER_NAME}")

def extract_printable_text(binary_data):
    # Keep only printable ascii characters and newlines
    # This filters out ESC/POS binary codes usually sent to thermal printers
    # We allow standard ASCII printable (32 to 126), \n, \r
    text = ""
    for byte in binary_data:
        if 32 <= byte <= 126 or byte in (10, 13):
            text += chr(byte)
    return text

def process_spool_file(job_id, document_name):
    # The Windows spool folder usually keeps files as 000XX.SPL based on job ID
    spool_dir = r"C:\Windows\System32\spool\PRINTERS"
    spl_filename = f"{job_id:05d}.SPL"
    spl_path = os.path.join(spool_dir, spl_filename)
    
    if not os.path.exists(spl_path):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Spool file not found for Job: {spl_path}")
        return False

    try:
        # Read the raw binary spool file
        with open(spl_path, "rb") as f:
            raw_data = f.read()
            
        if not raw_data:
            return False

        # Extract only printable characters
        clean_text = extract_printable_text(raw_data)
        
        # We check if the extracted text looks like an invoice (has some content)
        if len(clean_text.strip()) < 10:
             print(f"[{datetime.now().strftime('%H:%M:%S')}] Extracted text too short, skipping.")
             return True
             
        # Push to FastOrder Server (Supabase)
        payload = {
            "filename": f"Spool_Job_{job_id}_{document_name}.txt",
            "raw_content": clean_text,
            "agent_version": "2.0-Spooler"
        }
        
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        
        endpoint = f"{SUPABASE_URL}/rest/v1/milenium_telemetry"
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Sending telemetry for Job {job_id} to server...")
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        
        if response.status_code in [201, 204]:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Successfully uploaded Job {job_id}.")
            return True
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Error uploading Job {job_id}: HTTP {response.status_code}")
            return False
            
    except PermissionError:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Permission Denied reading {spl_path}. Run as Administrator!")
        return False
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Exception processing Job {job_id}: {e}")
        return False

def monitor_printer():
    try:
        hprinter = win32print.OpenPrinter(PRINTER_NAME)
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ERROR: Could not open printer '{PRINTER_NAME}'. Check name: {e}")
        return

    processed_jobs = set()
    
    try:
        while True:
            # Enumerate current print jobs
            jobs = win32print.EnumJobs(hprinter, 0, -1, 1)
            
            current_job_ids = set()
            
            for job in jobs:
                job_id = job['JobId']
                document = job['pDocument']
                current_job_ids.add(job_id)
                
                if job_id not in processed_jobs:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Detected New Job ID: {job_id} - {document}")
                    # Give the spooler a moment to finish writing the .SPL file
                    time.sleep(1.0)
                    
                    success = process_spool_file(job_id, document)
                    if success:
                        processed_jobs.add(job_id)
            
            # Clean up old jobs from our tracking set
            processed_jobs.intersection_update(current_job_ids)
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("Agent stopped manually.")
    finally:
        win32print.ClosePrinter(hprinter)

if __name__ == "__main__":
    if SUPABASE_URL == "TU_SUPABASE_URL_AQUI":
        print("ERROR: Please configure SUPABASE_URL and SUPABASE_ANON_KEY in config.ini")
        exit(1)
        
    monitor_printer()
