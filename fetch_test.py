import kagglehub
import pandas as pd

try:
  path1 = kagglehub.dataset_download("dheerajmpai/hospitals-and-beds-in-india")
  print("Path 1 downloaded to:", path1)
  path2 = kagglehub.dataset_download("prasad22/pmc-hospital-infrastructure")
  print("Path 2 downloaded to:", path2)
except Exception as e:
  print("Error:", e)
