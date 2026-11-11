"""Gera um vídeo a partir de um projeto com roteiro.json e animação HTML."""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
SCRIPTS = REPO / 'scripts'


def executar(comando, ambiente):
    subprocess.run(list(map(str, comando)), cwd=REPO, env=ambiente, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('projeto', type=Path)
    parser.add_argument('--reusar-voz', action='store_true',
                        help='Reusa uma narração existente se o roteiro for idêntico')
    parser.add_argument('--previa', action='store_true',
                        help='Gera quadros de amostra em vez do MP4')
    args = parser.parse_args()
    projeto = args.projeto.resolve()
    for arquivo in ('roteiro.json', 'index.html', 'animation.js'):
        if not (projeto / arquivo).is_file():
            parser.error(f'Arquivo obrigatório ausente: {projeto / arquivo}')
    roteiro = json.loads((projeto / 'roteiro.json').read_text(encoding='utf-8-sig'))
    if not isinstance(roteiro, list) or not roteiro or not all(
        isinstance(cena, dict) and all(isinstance(cena.get(campo), str) and cena[campo].strip()
                                      for campo in ('title', 'text', 'visual'))
        for cena in roteiro
    ):
        parser.error('O roteiro deve ser uma lista de cenas com title, text e visual.')
    ambiente = os.environ.copy()
    for variavel, padrao in [('VIDEO_FFMPEG', 'ffmpeg'), ('VIDEO_FFPROBE', 'ffprobe')]:
        caminho = shutil.which(ambiente.get(variavel, padrao))
        if not caminho:
            parser.error(f'Instale {padrao} no PATH ou defina {variavel}.')
        ambiente[variavel] = str(Path(caminho).resolve())
    node = shutil.which('node')
    if not node or not (REPO / 'node_modules/playwright/package.json').is_file():
        parser.error('Instale Node.js e execute npm ci na raiz do repositório.')
    assets = projeto / 'assets'
    build = projeto / 'build'
    assets.mkdir(exist_ok=True)
    build.mkdir(exist_ok=True)
    ambiente.update(VIDEO_PROJECT=str(projeto), VIDEO_BUILD=str(build))
    timeline = projeto / 'timeline.json'
    if args.reusar_voz:
        arquivos = [timeline, assets/'narracao.mp3']
        arquivos += [assets/f'voz-{i:02}.mp3' for i in range(len(roteiro))]
        if not all(p.is_file() and p.stat().st_size for p in arquivos):
            parser.error('Narração incompleta. Rode sem --reusar-voz.')
        cenas = json.loads(timeline.read_text(encoding='utf-8'))['scenes']
        if len(cenas) != len(roteiro) or any(
            any(nova[k] != antiga.get(k) for k in ('title', 'text', 'visual'))
            for nova, antiga in zip(roteiro, cenas)
        ):
            parser.error('O roteiro mudou. Rode sem --reusar-voz.')
    else:
        if timeline.exists():
            timeline.unlink()
        executar([sys.executable, SCRIPTS/'voz.py'], ambiente)
    render = [node, SCRIPTS/'render.cjs']
    if args.previa:
        executar([*render, '--preview'], ambiente)
        print(f'Quadros em {build}', flush=True)
        return
    executar([sys.executable, SCRIPTS/'trilha.py'], ambiente)
    for i in range(len(roteiro)):
        executar([*render, i, i], ambiente)
    executar([sys.executable, SCRIPTS/'montar.py'], ambiente)


if __name__ == '__main__':
    main()
