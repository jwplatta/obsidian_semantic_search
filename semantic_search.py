import json
import torch
from transformers import BertTokenizer, BertModel
from sklearn.neighbors import NearestNeighbors

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
bert = BertModel.from_pretrained('bert-base-uncased')

def generate_embeddings(query):
    bert.eval()

    inputs = tokenizer(query)
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

    return embeddings.detach().numpy().flatten()


with open('./chunk_embeddings.jsonl', 'r') as file:
    chunk_objects = [json.loads(line) for line in file]


nn = NearestNeighbors(n_neighbors=5, algorithm='ball_tree')

nn.kneighbors(
    generate_embeddings("How to create a new note in Obsidian?")[None, :]
)

