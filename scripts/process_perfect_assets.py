import os
import cv2
import numpy as np
from scipy.ndimage import binary_fill_holes

OUT_DIRS = [
    r"c:\Users\kalpk\Documents\antigravity\password-forge\public\assets\kick-buttowski",
    r"c:\Users\kalpk\Documents\antigravity\password-forge\dist\assets\kick-buttowski"
]
for d in OUT_DIRS:
    os.makedirs(d, exist_ok=True)

USER_UPLOADED = r"C:\Users\kalpk\.gemini\antigravity\brain\e05dbdde-6a98-4616-acb0-e3514074d50d\.user_uploaded"

def save_clean_rgba(bgr_img, mask, filename):
    h, w = bgr_img.shape[:2]
    # Ensure all interior holes are 100% filled!
    mask = binary_fill_holes(mask.astype(bool))
    
    # Also find external contour and fill it solid to guarantee 0 holes
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    solid_mask = np.zeros((h, w), dtype=np.uint8)
    for c in contours:
        if cv2.contourArea(c) > 400:
            cv2.drawContours(solid_mask, [c], -1, 255, -1)
            
    # Combine with binary_fill_holes
    final_alpha = np.maximum(mask.astype(np.uint8) * 255, solid_mask)
    
    # Create BGRA
    bgra = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = final_alpha
    
    # Crop to character bounding box with 6px padding
    y_idx, x_idx = np.where(final_alpha > 0)
    if len(y_idx) > 0 and len(x_idx) > 0:
        y1 = max(0, y_idx.min() - 6)
        y2 = min(h, y_idx.max() + 7)
        x1 = max(0, x_idx.min() - 6)
        x2 = min(w, x_idx.max() + 7)
        cropped = bgra[y1:y2, x1:x2]
    else:
        cropped = bgra
        
    for d in OUT_DIRS:
        out_path = os.path.join(d, filename)
        cv2.imwrite(out_path, cropped)
        
    print(f"[OK] Saved {filename}: {cropped.shape[1]}x{cropped.shape[0]} | FG={np.sum(final_alpha > 0)}")

# 1. Gigachad Kick (media_1794060493251_1f862f61.png)
def process_gigachad():
    path = os.path.join(USER_UPLOADED, "media_1794060493251_1f862f61.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[32:281, 56:442] = cv2.GC_PR_FGD
    mask[:30, :] = cv2.GC_BGD
    mask[:, :55] = cv2.GC_BGD
    mask[:, 445:] = cv2.GC_BGD
    
    # Definite FG: Helmet, face, sunglasses, beard, suit, collar
    mask[40:70, 220:280] = cv2.GC_FGD
    mask[90:170, 210:290] = cv2.GC_FGD # Entire face and sunglasses!
    mask[180:240, 200:300] = cv2.GC_FGD # Chest suit
    mask[120:150, 130:170] = cv2.GC_FGD # Left collar wing
    mask[120:150, 330:370] = cv2.GC_FGD # Right collar wing
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-gigachad.png")

# 2. Yewsuck Derp Kick (media_1794060313467_dd07d020.png)
def process_yewsuck():
    path = os.path.join(USER_UPLOADED, "media_1794060313467_dd07d020.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[64:h, 0:415] = cv2.GC_PR_FGD
    
    mask[:60, :] = cv2.GC_BGD  # Sky above helmet
    mask[:, 415:] = cv2.GC_BGD # Ramp on right
    mask[:160, :40] = cv2.GC_BGD # Top-left sky
    
    mask[75:130, 200:300] = cv2.GC_FGD  # Top of helmet
    mask[130:220, 150:280] = cv2.GC_FGD # Center of helmet
    mask[230:300, 310:390] = cv2.GC_FGD # Eyes
    mask[350:450, 150:350] = cv2.GC_FGD # Suit and yellow gloves
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-yewsuck.png")

# 3. Shrug Kick with Plaid Trapper Hat (media_1794055961330_d49fc428.png)
def process_shrug():
    path = os.path.join(USER_UPLOADED, "media_1794055961330_d49fc428.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[120:h, 30:450] = cv2.GC_PR_FGD
    mask[:115, :] = cv2.GC_BGD
    mask[:, :30] = cv2.GC_BGD
    mask[:, 450:] = cv2.GC_BGD
    
    mask[125:185, 180:310] = cv2.GC_FGD # Plaid Trapper Hat!
    mask[190:260, 190:270] = cv2.GC_FGD # Face & hair
    mask[290:370, 190:350] = cv2.GC_FGD # White Suit
    mask[240:305, 55:135] = cv2.GC_FGD  # Left glove
    mask[235:305, 305:385] = cv2.GC_FGD # Right glove
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-shrug.png")

# 4. Glare Kick (*buttowski-glare*) (media_1794060387771_2e9f1d5a.png)
def process_glare():
    path = os.path.join(USER_UPLOADED, "media_1794060387771_2e9f1d5a.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_PR_FGD
    mask[:20, :] = cv2.GC_BGD
    mask[:, :40] = cv2.GC_BGD
    mask[:, 280:] = cv2.GC_BGD
    
    mask[20:100, 100:220] = cv2.GC_FGD  # Helmet & stripe
    mask[100:160, 110:210] = cv2.GC_FGD # Face & squint
    mask[160:210, 80:240] = cv2.GC_FGD  # Suit collar
    mask[200:235, 45:275] = cv2.GC_FGD  # *buttowski-glare* subtitle
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-glare.png")

# 5. Screaming Gunther & Kick (media_1794055863439_03ffb224.png)
def process_screaming():
    path = os.path.join(USER_UPLOADED, "media_1794055863439_03ffb224.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[10:h, 120:380] = cv2.GC_PR_FGD
    mask[:10, :] = cv2.GC_BGD
    mask[:, :115] = cv2.GC_BGD
    mask[:, 385:] = cv2.GC_BGD
    
    mask[100:260, 150:350] = cv2.GC_FGD
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-screaming.png")

# 6. Thumbs Up Kick on Bike (media_1794055871343_69709c70.png)
def process_thumbsup():
    path = os.path.join(USER_UPLOADED, "media_1794055871343_69709c70.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[60:h, 110:430] = cv2.GC_PR_FGD
    mask[:55, :] = cv2.GC_BGD
    mask[:, :105] = cv2.GC_BGD
    mask[:, 435:] = cv2.GC_BGD
    
    mask[100:250, 150:350] = cv2.GC_FGD
    mask[75:140, 330:410] = cv2.GC_FGD
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-thumbsup.png")

# 7. Peeking Kick (media_1794055972169_16d5a0bf.png)
def process_peeking():
    path = os.path.join(USER_UPLOADED, "media_1794055972169_16d5a0bf.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[60:270, 70:340] = cv2.GC_PR_FGD
    mask[:55, :] = cv2.GC_BGD
    mask[:, :65] = cv2.GC_BGD
    mask[:, 345:] = cv2.GC_BGD
    
    mask[90:220, 100:300] = cv2.GC_FGD
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-peeking.png")

# 8. Iconic Rock-on Idle Kick (media_1793970031649_21e6f451.png)
def process_idle():
    path = os.path.join(USER_UPLOADED, "media_1793970031649_21e6f451.png")
    if not os.path.exists(path):
        path = os.path.join(USER_UPLOADED, "media_1793968303842_bc0c5a80.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    
    mask = np.zeros((h, w), np.uint8)
    mask[:] = cv2.GC_BGD
    mask[20:h-10, 100:w-100] = cv2.GC_PR_FGD
    mask[:15, :] = cv2.GC_BGD
    mask[:, :90] = cv2.GC_BGD
    mask[:, w-90:] = cv2.GC_BGD
    
    mask[50:180, 200:w-200] = cv2.GC_FGD
    mask[180:h-50, 200:w-200] = cv2.GC_FGD
    
    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)
    
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    save_clean_rgba(img, fg, "kick-idle.png")

# 9. Doctor Strange Kick (media_1794060476203_64a53894.png)
def process_doctor():
    path = os.path.join(USER_UPLOADED, "media_1794060476203_64a53894.png")
    img = cv2.imread(path)
    h, w = img.shape[:2]
    bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    for d in OUT_DIRS:
        cv2.imwrite(os.path.join(d, "kick-doctor.png"), bgra)
    print(f"[OK] Saved kick-doctor.png: {w}x{h}")

if __name__ == '__main__':
    print("Re-processing all character assets with 100% solid opacity and contour hole filling...")
    process_gigachad()
    process_yewsuck()
    process_shrug()
    process_glare()
    process_screaming()
    process_thumbsup()
    process_peeking()
    process_idle()
    process_doctor()
    print("ALL ASSETS SUCCESSFULLY RE-GENERATED WITH 100% SOLID FACES/HELMETS!")
