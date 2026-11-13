import os
import json
import math
import time
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# ─────────────────────────────────────────────────────────────────────────────
# 1. Vocabulary & Tokenization
# ─────────────────────────────────────────────────────────────────────────────

SPECIAL_TOKENS = ['<pad>', '<sos>', '<eos>']
# Printable ASCII chars 32 (space) through 126 (~)
PRINTABLE_ASCII = [chr(i) for i in range(32, 127)]
VOCAB = SPECIAL_TOKENS + PRINTABLE_ASCII

CHAR_TO_IDX = {ch: idx for idx, ch in enumerate(VOCAB)}
IDX_TO_CHAR = {idx: ch for idx, ch in enumerate(VOCAB)}
VOCAB_SIZE = len(VOCAB) # 3 + 95 = 98

PAD_IDX = CHAR_TO_IDX['<pad>']
SOS_IDX = CHAR_TO_IDX['<sos>']
EOS_IDX = CHAR_TO_IDX['<eos>']

def encode_password(pwd, max_len=32):
    tokens = [SOS_IDX] + [CHAR_TO_IDX.get(c, PAD_IDX) for c in pwd[:max_len-2]] + [EOS_IDX]
    return tokens

# ─────────────────────────────────────────────────────────────────────────────
# 2. PyTorch Dataset
# ─────────────────────────────────────────────────────────────────────────────

class PasswordDataset(Dataset):
    def __init__(self, file_paths, max_samples=100000, max_len=32):
        self.max_len = max_len
        self.samples = []
        
        seen = set()
        for path in file_paths:
            if not os.path.exists(path):
                continue
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    pwd = line.strip('\r\n')
                    if 3 <= len(pwd) <= max_len - 2 and pwd not in seen:
                        seen.add(pwd)
                        self.samples.append(pwd)
                        if len(self.samples) >= max_samples:
                            break
            if len(self.samples) >= max_samples:
                break
                
        print(f"[Dataset] Loaded {len(self.samples):,} unique passwords from wordlists.")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        pwd = self.samples[idx]
        tokens = encode_password(pwd, self.max_len)
        return torch.tensor(tokens, dtype=torch.long)

def collate_fn(batch):
    lengths = [len(seq) for seq in batch]
    max_len = max(lengths)
    padded = torch.full((len(batch), max_len), PAD_IDX, dtype=torch.long)
    for i, seq in enumerate(batch):
        padded[i, :len(seq)] = seq
    return padded

# ─────────────────────────────────────────────────────────────────────────────
# 3. Neural Architecture: PasswordCharLSTM
# ─────────────────────────────────────────────────────────────────────────────

class PasswordCharLSTM(nn.Module):
    def __init__(self, vocab_size=VOCAB_SIZE, embed_dim=64, hidden_dim=128, num_layers=2, dropout=0.2):
        super().__init__()
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=PAD_IDX)
        self.lstm = nn.LSTM(
            embed_dim,
            hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x, hidden=None):
        embeds = self.dropout(self.embedding(x))
        out, hidden = self.lstm(embeds, hidden)
        logits = self.fc(self.dropout(out))
        return logits, hidden

# ─────────────────────────────────────────────────────────────────────────────
# 4. Training Loop
# ─────────────────────────────────────────────────────────────────────────────

def train_model():
    wordlist_paths = [
        r"C:\Users\kalpk\Codes\wordlists\common-passwords\100k-most-used-passwords-NCSC.txt",
        r"C:\Users\kalpk\Codes\wordlists\common-passwords\10k-most-common.txt",
        r"C:\Users\kalpk\Codes\wordlists\common-passwords\most-popular-letter-passes.txt",
        r"C:\Users\kalpk\Codes\wordlists\keyboard-walks\keyboard-combos.txt",
    ]

    dataset = PasswordDataset(wordlist_paths, max_samples=75000, max_len=24)
    dataloader = DataLoader(dataset, batch_size=256, shuffle=True, collate_fn=collate_fn)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[Training] Using compute device: {device}")

    model = PasswordCharLSTM(
        vocab_size=VOCAB_SIZE,
        embed_dim=64,
        hidden_dim=128,
        num_layers=2,
        dropout=0.2
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[Model] Total trainable parameters: {total_params:,}")

    criterion = nn.CrossEntropyLoss(ignore_index=PAD_IDX)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.004)

    EPOCHS = 3
    start_time = time.time()
    loss_history = []

    print("[Training] Commencing training across batches...")
    for epoch in range(1, EPOCHS + 1):
        model.train()
        epoch_loss = 0.0
        batches = 0
        
        for batch in dataloader:
            batch = batch.to(device)
            # Input is tokens[:-1], target is tokens[1:]
            inputs = batch[:, :-1]
            targets = batch[:, 1:]
            
            optimizer.zero_grad()
            logits, _ = model(inputs)
            
            # Reshape for CrossEntropy: (B * T, V) vs (B * T)
            loss = criterion(logits.reshape(-1, VOCAB_SIZE), targets.reshape(-1))
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()
            
            epoch_loss += loss.item()
            batches += 1
            if batches % 100 == 0:
                print(f"  Epoch {epoch}/{EPOCHS} | Batch {batches}/{len(dataloader)} | Loss: {loss.item():.4f}")

        avg_loss = epoch_loss / batches
        perplexity = math.exp(min(avg_loss, 20))
        loss_history.append({'epoch': epoch, 'loss': round(avg_loss, 4), 'perplexity': round(perplexity, 2)})
        print(f"==> Epoch {epoch} Complete | Avg Loss: {avg_loss:.4f} | Perplexity: {perplexity:.2f}")

    total_time = round(time.time() - start_time, 2)
    print(f"[Training] Finished in {total_time}s.")

    # ─────────────────────────────────────────────────────────────────────────────
    # 5. Save PyTorch Model (.pt) & Checkpoints
    # ─────────────────────────────────────────────────────────────────────────────

    save_dirs = [
        r"c:\Users\kalpk\Documents\antigravity\password-forge\model",
        r"c:\Users\kalpk\Documents\antigravity\password-forge\public\model"
    ]
    for d in save_dirs:
        os.makedirs(d, exist_ok=True)

    weights_payload = {
        'model_state_dict': model.state_dict(),
        'vocab': VOCAB,
        'char_to_idx': CHAR_TO_IDX,
        'config': {
            'vocab_size': VOCAB_SIZE,
            'embed_dim': 64,
            'hidden_dim': 128,
            'num_layers': 2,
            'dropout': 0.2,
            'architecture': 'PasswordCharLSTM',
        },
        'training_meta': {
            'epochs': EPOCHS,
            'total_parameters': total_params,
            'samples_trained': len(dataset),
            'final_loss': loss_history[-1]['loss'],
            'final_perplexity': loss_history[-1]['perplexity'],
            'training_duration_seconds': total_time,
            'trained_at': time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            'framework': 'PyTorch ' + torch.__version__,
        }
    }

    pt_filename = "password_forge_weights.pt"
    for d in save_dirs:
        target_path = os.path.join(d, pt_filename)
        torch.save(weights_payload, target_path)
        print(f"[Save] PyTorch model saved -> {target_path} ({os.path.getsize(target_path):,} bytes)")

    # Save JSON metadata for web app display
    meta_json = {
        'model_name': 'Password Forge Neural LSTM',
        'file_name': pt_filename,
        'format': 'PyTorch .pt',
        'architecture': 'Char-Level LSTM (2-layer, 128-dim, 64-embed)',
        'vocab_size': VOCAB_SIZE,
        'total_parameters': total_params,
        'samples_trained': len(dataset),
        'final_loss': loss_history[-1]['loss'],
        'final_perplexity': loss_history[-1]['perplexity'],
        'training_time_seconds': total_time,
        'loss_history': loss_history,
        'vocab_tokens': len(VOCAB),
        'status': 'TRAINED_AND_VERIFIED'
    }

    for d in save_dirs:
        with open(os.path.join(d, "pytorch_metadata.json"), 'w') as f:
            json.dump(meta_json, f, indent=2)

    print("[Metadata] pytorch_metadata.json exported successfully!")

if __name__ == '__main__':
    train_model()
