import array
import bisect
import json
import math
import wave
from ambiente import projeto

root = projeto
timeline = json.loads((root/'timeline.json').read_text(encoding='utf8'))
scenes = timeline['scenes']
starts = [s['start'] for s in scenes]
duration = timeline['duration']
rate = 16000
track = array.array('h')
notes = (55.0, 65.406, 49.0, 58.271)
for n in range(round(rate*duration)):
    t = n/rate
    scene = bisect.bisect_right(starts,t)-1
    local = t-starts[scene]
    freq = notes[int(t/3.2)%len(notes)]
    amplitude = .48+.52*math.sin(math.pi*((t%3.2)/3.2))**2
    pad = amplitude*(.008*math.sin(math.tau*freq*t)+.005*math.sin(math.tau*1.5*freq*t))
    drum_age = t%.80
    drum = .018*math.exp(-14*drum_age)*math.sin(math.tau*58*drum_age)
    tick_age = local%(.34 if scene in (1,2,3,4) else .40)
    tick_freq = 680 if scene in (1,2,3,4) else 440
    tick = .017*math.exp(-95*tick_age)*math.sin(math.tau*tick_freq*tick_age)
    transition = .020*math.exp(-7*local)*math.sin(math.tau*(92*local-14*local*local))
    fade = min(1,t/.30,(duration-t)/2.20)
    track.append(round(32767*fade*(pad+drum+tick+transition)))
with wave.open(str(root/'assets/trilha.wav'),'wb') as stream:
    stream.setparams((1,2,rate,0,'NONE','not compressed'))
    stream.writeframes(track.tobytes())
