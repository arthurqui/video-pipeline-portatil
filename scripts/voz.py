import asyncio
import json
import subprocess



from ambiente import projeto, ffmpeg, ffprobe
import edge_tts

root = projeto
scenes = json.loads((root / 'roteiro.json').read_text(encoding='utf-8'))
async def voice(index, scene, gate):
    async with gate:
        dest = root / 'assets' / f'voz-{index:02}.mp3'
        for attempt in range(6):
            words = []
            try:
                request = edge_tts.Communicate(scene['text'], 'pt-BR-ThalitaMultilingualNeural', rate='+11%', boundary='WordBoundary')
                with dest.open('wb') as output:
                    async for packet in request.stream():
                        if packet['type'] == 'audio':
                            output.write(packet['data'])
                        elif packet['type'] == 'WordBoundary':
                            words.append(packet)
                break
            except Exception:
                if attempt == 5:
                    raise
                await asyncio.sleep(min(6, 2 ** attempt))
        length = float(subprocess.check_output([ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(dest)], text=True))
        if not words:
            raise RuntimeError(f'No word timing returned for scene {index+1}')
        print(f'{index+1}: {length:.2f}s, {len(words)} palavras', flush=True)
        return length, words

async def main():
    gate = asyncio.Semaphore(1)
    results = [await voice(i, scene, gate) for i, scene in enumerate(scenes)]
    now = 0
    for scene, (length, groups) in zip(scenes, results):
        scene.update(start=now, end=now+length, captions=[])
        for index, word in enumerate(groups):
            start = word['offset'] / 10_000_000
            stop = start + word['duration'] / 10_000_000
            next_start = groups[index+1]['offset'] / 10_000_000 if index+1 < len(groups) else length
            end = min(length, next_start, stop + .085)
            if start < end:
                scene['captions'].append(dict(start=now+start, end=now+end, text=word['text']))
        now += length
    plan=['# Roteiro e direção','']
    for i, scene in enumerate(scenes,1):
        plan.extend([f"## {i:02} · {scene['title']} · {scene['start']:.1f}–{scene['end']:.1f}s",'',f"> {scene['text']}",'',scene['visual'],''])
    (root/'Roteiro-e-direcao.md').write_text('\n'.join(plan),encoding='utf-8')
    listing = root/'assets'/'concat.txt'
    listing.write_text('\n'.join(f"file 'voz-{i:02}.mp3'" for i in range(len(scenes))), encoding='utf-8')
    subprocess.run([ffmpeg,'-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(root/'assets/narracao.mp3')],check=True)

    (root/'timeline.json').write_text(json.dumps(dict(duration=now, scenes=scenes), ensure_ascii=False, indent=2), encoding='utf-8')

asyncio.run(main())
