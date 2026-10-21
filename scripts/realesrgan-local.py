"""Real-ESRGAN SRVGGNetCompact x4 inference. Upstream BSD-3-Clause notice alongside this file."""
import argparse,sys,os
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'../.data/ai-runtime'))
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image
class SRVGGNetCompact(nn.Module):
 def __init__(self):
  super().__init__(); self.body=nn.ModuleList([nn.Conv2d(3,64,3,1,1),nn.PReLU(64)])
  for _ in range(32):self.body.extend([nn.Conv2d(64,64,3,1,1),nn.PReLU(64)])
  self.body.append(nn.Conv2d(64,48,3,1,1));self.upsampler=nn.PixelShuffle(4)
 def forward(self,x):
  out=x
  for layer in self.body:out=layer(out)
  return self.upsampler(out)+F.interpolate(x,scale_factor=4,mode='nearest')
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('--model',required=True);p.add_argument('--scale',type=int,choices=[2,4],default=4);p.add_argument('--tile',type=int,default=384);p.add_argument('--threads',type=int,default=4);a=p.parse_args()
torch.set_num_threads(a.threads)
model=SRVGGNetCompact().eval();checkpoint=torch.load(a.model,map_location='cpu',weights_only=True);model.load_state_dict(checkpoint.get('params_ema',checkpoint.get('params',checkpoint)))
im=Image.open(a.input).convert('RGB');arr=np.asarray(im,dtype=np.float32)/255;h,w=arr.shape[:2]
if w*h*a.scale*a.scale>40_000_000:raise ValueError('AI source exceeds the 40 megapixel enhanced-image limit; crop or reduce the source first')
source=torch.from_numpy(arr.transpose(2,0,1)).unsqueeze(0);output=np.empty((h*a.scale,w*a.scale,3),dtype=np.uint8);pad=36
with torch.inference_mode():
 for y in range(0,h,a.tile):
  for x in range(0,w,a.tile):
   y1=max(0,y-pad);x1=max(0,x-pad);y2=min(h,y+a.tile+pad);x2=min(w,x+a.tile+pad)
   tile=model(source[:,:,y1:y2,x1:x2]).clamp(0,1)[0].permute(1,2,0).numpy()
   th=min(a.tile,h-y);tw=min(a.tile,w-x)
   crop=np.rint(tile[(y-y1)*4:(y-y1+th)*4,(x-x1)*4:(x-x1+tw)*4]*255).astype(np.uint8)
   if a.scale==2:crop=np.asarray(Image.fromarray(crop).resize((tw*2,th*2),Image.Resampling.LANCZOS))
   output[y*a.scale:(y+th)*a.scale,x*a.scale:(x+tw)*a.scale]=crop
  print(f'{min(99,round((y+a.tile)/h*100))}',flush=True)
Image.fromarray(output).save(a.output,'PNG')
