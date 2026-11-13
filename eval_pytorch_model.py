import os
import sys
import math
import torch
import torch.nn as nn
from train_pytorch_model import PasswordCharLSTM, VOCAB, CHAR_TO_IDX, PAD_IDX, SOS_IDX, EOS_IDX, encode_password

def load_forge_model(weights_path=None):
    if weights_path is None:
        weights_path = os.path.join(os.path.dirname(__file__), "model", "password_forge_weights.pt")
        if not os.path.exists(weights_path):
            weights_path = os.path.join(os.path.dirname(__file__), "public", "model", "password_forge_weights.pt")
            
    if not os.path.exists(weights_path):
        raise FileNotFoundError(f"Model file not found at {weights_path}")
        
    checkpoint = torch.load(weights_path, map_location='cpu')
    config = checkpoint.get('config', {})
    
    model = PasswordCharLSTM(
        vocab_size=config.get('vocab_size', len(VOCAB)),
        embed_dim=config.get('embed_dim', 64),
        hidden_dim=config.get('hidden_dim', 128),
        num_layers=config.get('num_layers', 2),
        dropout=0.0
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    return model, checkpoint.get('training_meta', {})

def evaluate_password_neural(model, password: str):
    """
    Evaluates password predictability using the trained PyTorch Char-LSTM model.
    Returns:
      - per_char_surprisal: negative log-likelihood (in bits) per character
      - avg_loss: cross entropy loss
      - perplexity: exp(avg_loss)
      - total_surprisal_bits: total bits of information
    """
    tokens = encode_password(password)
    x = torch.tensor([tokens[:-1]], dtype=torch.long)
    targets = torch.tensor([tokens[1:]], dtype=torch.long)
    
    with torch.no_grad():
        logits, _ = model(x)
        # Log-softmax over vocab
        log_probs = nn.functional.log_softmax(logits, dim=-1)
        
        target_log_probs = log_probs[0, torch.arange(targets.size(1)), targets[0]]
        losses = -target_log_probs # nll per character
        
        char_tokens = [VOCAB[t] for t in tokens[1:]]
        char_surprisals = [(char, round(loss.item() / math.log(2), 2)) for char, loss in zip(char_tokens, losses)]
        
        avg_loss = losses.mean().item()
        perplexity = math.exp(avg_loss)
        total_bits = (losses.sum().item()) / math.log(2)
        
    return {
        'password': password,
        'avg_cross_entropy_loss': round(avg_loss, 4),
        'perplexity': round(perplexity, 2),
        'total_surprisal_bits': round(total_bits, 2),
        'char_surprisals': char_surprisals
    }

if __name__ == '__main__':
    model, meta = load_forge_model()
    print("=" * 60)
    print("KICK BUTTOWSKI PASSWORD FORGE - PYTORCH NEURAL EVALUATOR")
    print(f"Loaded weights from: password_forge_weights.pt")
    print(f"Model parameters: {meta.get('total_parameters', 250338):,}")
    print(f"Trained on: {meta.get('samples_trained', 75000):,} passwords")
    print("=" * 60)
    
    test_passwords = [
        "123456",
        "password",
        "qwerty123",
        "dragon99",
        "Tr0ub4dor&3",
        "K!ck_Bwt0w$k1_99%X#"
    ]
    
    for pwd in test_passwords:
        res = evaluate_password_neural(model, pwd)
        print(f"\nPassword: '{pwd}'")
        print(f"  Neural Cross-Entropy Loss: {res['avg_cross_entropy_loss']} | Perplexity: {res['perplexity']}")
        print(f"  Neural Surprisal: {res['total_surprisal_bits']} bits")
        # Print first few char surprisals
        print(f"  Char surprisal breakdown: {res['char_surprisals'][:6]}...")
