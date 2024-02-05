import os
from transformers import BertTokenizer, BertModel
import torch
import pandas as pd

obsidian_vault_path = '/Users/jplatta/Library/Mobile Documents/iCloud~md~obsidian/Documents/development_vault'
skip_dir = ['.obsidian', '.trash']
dirs = [obsidian_vault_path]
markdown_files = []
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
bert = BertModel.from_pretrained('bert-base-uncased')
bert.eval()

while dirs != []:
  dir = dirs.pop()
  if os.path.basename(dir) in skip_dir:
      continue

  for file in os.listdir(dir):
      file_path = os.path.join(dir, file)
      if os.path.isdir(file_path):
          dirs.append(file_path)
      elif file_path.endswith(".md"):
          markdown_files.append(file_path)

chunk_id = 0

chunk_embeddings = pd.DataFrame(columns=['chunk', 'embedding'])
for f in markdown_files:
    print("Processing file: ", f)
    with open(f, 'r') as file:
        data = file.read()
        chunks = data.split("\n")

        for chunk in chunks:
            chunk = chunk.strip()
            if chunk == "":
                continue

            print(f'Processing chunk {chunk_id}: ', chunk)

            inputs = tokenizer(chunk)
            input_ids = torch.tensor(inputs['input_ids'])
            attention_mask = torch.tensor(inputs['attention_mask'])
            token_type_ids = torch.tensor(inputs['token_type_ids'])
            embeddings = bert(
                input_ids=input_ids.unsqueeze(0),
                attention_mask=attention_mask.unsqueeze(0),
                token_type_ids=token_type_ids.unsqueeze(0)
            )
            embeddings = embeddings.last_hidden_state
            embeddings = torch.mean(embeddings, dim=1)
            chunk_embeddings.loc[len(chunk_embeddings)] = \
                {'chunk': chunk, 'embedding': embeddings.detach().numpy().flatten() }
            chunk_id += 1

chunk_embeddings.to_csv('chunk_embeddings.csv', index=False, header=True)