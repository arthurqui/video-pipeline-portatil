import array
import json
import math
import subprocess
from ambiente import projeto, build, ffmpeg as ff, ffprobe as probe

root = projeto
work = build
timeline = json.loads((root / 'timeline.json').read_text(encoding='utf-8'))
scenes = timeline['scenes']
movie = work / 'video.mp4'

def ffmpeg(*args):
    subprocess.run([ff, '-v', 'error', '-y', *map(str, args)], check=True)

def metadata(path):
    return json.loads(subprocess.check_output([probe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))

parts = [(i, i) for i in range(len(scenes))]
for first, last in parts:
    part = work / f'part-{first}.mp4'
    frames = int(metadata(part)['streams'][0]['nb_frames'])
    expected = math.ceil(scenes[last]['end'] * 24) - math.ceil(scenes[first]['start'] * 24)
    assert frames == expected, (part, frames, expected)
listing = work / 'partes.txt'
listing.write_text(''.join(f"file 'part-{first}.mp4'\n" for first, _ in parts), encoding='utf-8')
ffmpeg('-f', 'concat', '-safe', 0, '-i', listing, '-i', root/'assets/narracao.mp3',
       '-i', root/'assets/trilha.wav', '-filter_complex', '[1:a]volume=4.5dB,adelay=22:all=1[voice];[2:a]volume=2dB[music];[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95:level=0:latency=1[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
       '-movflags', '+faststart', '-t', timeline['duration'], movie)
result = metadata(movie)
v, a = result['streams']
assert (v['width'], v['height'], a['codec_type']) == (720,1280,'audio')
assert abs(float(result['format']['duration']) - timeline['duration']) < .1

def sample(path, t):
    raw = subprocess.check_output([ff, '-v', 'error', '-ss', str(t), '-i', str(path),
                                   '-t', '1.5', '-vn', '-ac', '1', '-ar', '4000', '-f', 's16le', '-'])
    return array.array('h', raw)

for i, s in enumerate(scenes):
    begin = max(.2, s['captions'][0]['start'] - s['start'] + .05)
    pos = s['start'] + begin
    a = sample(movie, pos)
    b = sample(root / 'assets' / f'voz-{i:02}.mp3', begin)
    power = math.sqrt(sum(x*x for x in a) * sum(y*y for y in b))
    if not power:
        raise RuntimeError(f'Cena {i+1} sem voz no trecho de verificação')
    correlations = [sum(x*y for x,y in zip(a[max(d,0):],b[max(-d,0):])) / power for d in range(-500,501)]
    best = max(correlations)
    shift = (correlations.index(best) - 500) / 4000
    assert best > .80 and abs(shift)<.085, (i,best,shift)
    print(f"Cena {i+1}: voz confirmada, desvio {shift*1000:.0f} ms, {len(s['captions'])} palavras")
    assert all(w['start'] < w['end'] <= s['end'] for w in s['captions'])
    ffmpeg('-ss', s['start'] + (s['end'] - s['start'])*.68, '-i', movie, '-frames:v', 1, '-vf', 'scale=270:480', work / f'final-{i}.jpg')
print(movie, result['format']['duration'])
