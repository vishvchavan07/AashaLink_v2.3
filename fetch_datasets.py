import kagglehub
import csv
import json
import os

def csv_to_dict(csv_path, limit=20):
    data = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= limit: break
            data.append(row)
    return data

try:
    path1 = kagglehub.dataset_download("dheerajmpai/hospitals-and-beds-in-india")
    csv_file1 = [os.path.join(path1, f) for f in os.listdir(path1) if f.endswith('.csv')][0]
    beds_data = csv_to_dict(csv_file1)
except Exception as e:
    beds_data = {"error": str(e)}

try:
    path2 = kagglehub.dataset_download("prasad22/pmc-hospital-infrastructure")
    csv_file2 = [os.path.join(path2, f) for f in os.listdir(path2) if f.endswith('.csv')][0]
    pmc_data = csv_to_dict(csv_file2)
except Exception as e:
    pmc_data = {"error": str(e)}

output = {
    "hospitals_and_beds": beds_data,
    "pmc_infrastructure": pmc_data
}

with open("src/data/raw_datasets.json", "w") as f:
    json.dump(output, f, indent=2)

print("Datasets fetched and saved to src/data/raw_datasets.json")
