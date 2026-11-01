import sys
d=open(sys.argv[1],'rb').read(); out=sys.argv[2]
i=0;k=0;blocks=[]
while i<len(d):
    n=d[i]|d[i+1]<<8; b=d[i+2:i+2+n]; blocks.append(b); i+=2+n
for j in range(0,len(blocks),2):
    h=blocks[j]; body=blocks[j+1][1:-1]
    name=h[2:12].decode().strip(); open(f"{out}/{name}.bin","wb").write(body)
    print(name,h[1],len(body),"start/len",int.from_bytes(h[14:16],'little'))
