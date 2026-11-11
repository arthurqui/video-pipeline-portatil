# Produção portátil de vídeos 3D narrados

Este projeto transforma um roteiro em um MP4 vertical de 720 × 1280 a 24 quadros por segundo. O Python gera a narração e os tempos de cada palavra com Edge TTS. Three.js desenha as cenas e Playwright captura os quadros no Chromium. FFmpeg monta o vídeo e mistura a trilha com a narração.

## Instalação em outro computador

1. Instale Git, Python 3.9 ou superior, Node.js 18 ou superior e FFmpeg com FFprobe e suporte ao codificador libx264. Coloque os executáveis no PATH.
2. Clone o repositório com uma conta autorizada e entre na pasta.

```powershell
gh repo clone arthurqui/video-pipeline-portatil
cd video-pipeline-portatil
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
npx playwright install chromium
```

No Linux ou macOS, use `.venv/bin/python` no lugar de `.\.venv\Scripts\python.exe`. No Linux, se faltarem bibliotecas do navegador, use `npx playwright install --with-deps chromium`. O download do navegador é uma etapa de instalação. Para usar o Chrome já instalado, defina `VIDEO_BROWSER_CHANNEL=chrome` no ambiente antes de rodar.

O gerador encontra `ffmpeg` e `ffprobe` no PATH. Se preferir indicar os executáveis, defina `VIDEO_FFMPEG` e `VIDEO_FFPROBE` com os caminhos completos. No PowerShell, por exemplo, use `$env:VIDEO_FFMPEG = 'D:/ffmpeg/bin/ffmpeg.exe'` e `$env:VIDEO_FFPROBE = 'D:/ffmpeg/bin/ffprobe.exe'`.

## Primeiro vídeo

```powershell
.\.venv\Scripts\python.exe gerar.py projetos/modelo
```

O MP4 fica em `projetos/modelo/build/video.mp4`. O exemplo completo sobre a história dos computadores roda com o mesmo comando, trocando `projetos/modelo` por `projetos/computadores`. Ele dura cerca de dois minutos e meio e pode levar alguns minutos para renderizar.

Acrescente `--previa` para gerar um quadro de amostra por cena em `build`. Use `--reusar-voz` se estiver ajustando a animação e o roteiro continuar idêntico. Na primeira execução, a síntese de voz requer internet e envia o texto narrado ao serviço da Microsoft. A renderização e a montagem usam arquivos locais.

## Instruções para um agente de IA sem contexto anterior

1. Leia o pedido do usuário. Quando o assunto exigir pesquisa, confira fontes primárias ou institucionais e guarde as referências em `Pesquisa.md` no projeto. Defina uma pergunta ou ideia central, desenvolva a explicação em cenas e escreva um encerramento que responda ao gancho.
2. Copie `projetos/modelo` para uma pasta nova. Use `projetos/computadores` como referência de um episódio com múltiplas cenas e GSAP. Os arquivos Three.js e GSAP ficam em `assets`. O modelo usa Three.js e o exemplo completo também usa GSAP.
3. Escreva `roteiro.json` como uma lista de objetos. Cada cena precisa de `title` para o título da cena, `text` para o que será falado e `visual` para ações, câmera e elementos na tela. Escreva a narração em português brasileiro com frases naturais. Planeje um vídeo com até três minutos quando o usuário pedir um Short.
4. Implemente as cenas em `animation.js` e carregue o módulo em `index.html`. A página deve ter um canvas de saída 540 × 960 que já contenha animação e legendas. Leia `timeline.json`, que o gerador cria a partir da voz. Ele contém `duration`, `scenes[]`, `start`, `end` e `captions[]` com `start`, `end` e `text`. Todos os tempos estão em segundos absolutos. Exponha `window.seekTo(seconds)` para desenhar qualquer quadro e marque `window.animationReady = true` quando a página puder renderizar. Use o tempo recebido para definir poses, câmera e efeitos, inclusive após recarregar a página. Mantenha as cenas em 3D low poly e mostre uma palavra de legenda por vez.
5. Rode `gerar.py` com `--previa` e revise enquadramento e legibilidade. Depois de revisar a prévia, rode de novo com `--reusar-voz` e sem `--previa`. A voz padrão é `pt-BR-ThalitaMultilingualNeural` a `+11%`. Se a voz falhar, verifique a conexão e repita. Trate qualquer versão sem narração como prévia.
6. Abra o MP4 final. Confira o áudio no começo, no meio e no fim, revise os quadros de cada cena e verifique se a voz e as legendas estão sincronizadas. A montagem valida resolução, duração e presença da voz no começo de cada cena por comparação de áudio. O gerador também grava `Roteiro-e-direcao.md` com a narração, as indicações visuais e os tempos. Entregue esse documento, o MP4 e a pesquisa quando fizer parte do pedido.

A trilha original é sintetizada em `scripts/trilha.py`. Cada projeto gera seus próprios áudios, linha do tempo e renderizações. O repositório contém os arquivos de origem e as dependências declaradas. A instalação baixa os pacotes de Python e Node.js e o navegador. FFmpeg é um pré-requisito do sistema.
