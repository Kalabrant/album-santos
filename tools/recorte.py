"""Quita el fondo gris liso de las ilustraciones (relleno desde los bordes)
Necesita: pip install opencv-python-headless numpy pillow"""
import cv2, numpy as np, sys
from PIL import Image
def cut(path, tol=18):
    im=cv2.imread(path); h,w=im.shape[:2]
    b=cv2.GaussianBlur(im,(3,3),0)
    mask=np.zeros((h+2,w+2),np.uint8)
    flags=4|cv2.FLOODFILL_MASK_ONLY|cv2.FLOODFILL_FIXED_RANGE|(255<<8)
    # seeds along border
    for (x,y) in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]+[(x,0) for x in range(0,w,25)]+[(x,h-1) for x in range(0,w,25)]+[(0,y) for y in range(0,h,25)]+[(w-1,y) for y in range(0,h,25)]:
        if mask[y+1,x+1]: continue
        seedcol=b[y,x].astype(int)
        if abs(seedcol - b[2,2].astype(int)).max()>20: continue
        cv2.floodFill(b,mask,(x,y),0,(tol,)*3,(tol,)*3,flags)
    bg=mask[1:-1,1:-1]
    fg=(255-bg)
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    bgc=np.median(im[bg>0].reshape(-1,3),axis=0)
    dist=np.abs(im.astype(int)-bgc).max(axis=2)
    band=cv2.dilate(bg,np.ones((9,9),np.uint8))>0
    soft=np.clip((dist-10)/18.0,0,1)*255
    a=fg.astype(float)
    a[band]=np.minimum(a[band],soft[band])
    # quitamos islas pequeñas
    n,lab,st,_=cv2.connectedComponentsWithStats((a>40).astype(np.uint8),8)
    for i in range(1,n):
        if st[i,cv2.CC_STAT_AREA]<60: a[lab==i]=0
    a=cv2.GaussianBlur(a.astype(np.uint8),(3,3),0).astype(float)
    rgba=cv2.cvtColor(im,cv2.COLOR_BGR2RGBA)
    # sombras del suelo: grises sin color en la parte baja -> sombra negra translúcida
    L=im.astype(float).mean(axis=2); bgL=float(bgc.mean())
    chroma=im.max(axis=2).astype(int)-im.min(axis=2).astype(int)
    near=cv2.dilate(bg,np.ones((31,31),np.uint8))>0
    yy=np.arange(h)[:,None]*np.ones((1,w))
    sh=(yy>0.62*h)&(chroma<14)&(L>bgL-75)&(L<bgL+10)&near
    sh=cv2.morphologyEx(sh.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8))>0
    salpha=np.clip((bgL-L)/75.0,0,1)*200
    rgba[sh,0:3]=0
    a[sh]=np.minimum(a[sh],salpha[sh])
    rgba[:,:,3]=a.astype(np.uint8)
    return Image.fromarray(rgba)
