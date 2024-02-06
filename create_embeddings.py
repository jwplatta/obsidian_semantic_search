import os
import json
from transformers import BertTokenizer, BertModel
import torch
import numpy as np
from tqdm import tqdm

obsidian_vault_path = '/Users/jplatta/Library/Mobile Documents/iCloud~md~obsidian/Documents/development_vault'
skip_dir = ['.obsidian', '.trash']
dirs = [obsidian_vault_path]
markdown_files = []
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
bert = BertModel.from_pretrained('bert-base-uncased')
bert.eval()


class Chunk:
    def __init__(
        self,
        chunk_id=None, file=None,
        line_idx=None, chunk_text="",
        embedding=np.array([])
    ):
        self.chunk_id = chunk_id
        self.file = file
        self.line_idx = line_idx
        self.chunk_text = chunk_text
        self.embedding = embedding


    def size(self):
        return len(self.chunk_text)


    def __str__(self):
        return f'Chunk {self.chunk_id} from {self.file} at line {self.line_idx}'


    def __dict__(self):
        return {
            'chunk_id': self.chunk_id,
            'file': self.file,
            'line_idx': self.line_idx,
            'chunk_text': self.chunk_text,
            'embedding': self.embedding
        }

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
chunk_objects = []
for f in markdown_files:
    print(f)
    with open(f, 'r') as file:
        data = file.read()
        lines = data.split('\n')

        chunk = Chunk(
            chunk_id=chunk_id,
            file=f,
            line_idx=0
        )
        chunk_objects.append(chunk)
        for line_idx, line in enumerate(lines):
            if line.strip() == "":
                continue
            elif chunk.size() < 500:
                chunk.chunk_text += line.strip() + '\n'
            else:
                chunk_id += 1
                chunk = Chunk(
                    chunk_id=chunk_id,
                    file=f,
                    line_idx=line_idx,
                    chunk_text=line.strip()
                )
                chunk_objects.append(chunk)


        for chunk in tqdm(chunk_objects):
            inputs = tokenizer(chunk.chunk_text)
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
            chunk.embedding = embeddings.detach().numpy().flatten().tolist()


with open('chunk_embeddings.jsonl', 'w') as f:
    for chunk in tqdm(chunk_objects):
        f.write(json.dumps(chunk.__dict__()) + '\n')