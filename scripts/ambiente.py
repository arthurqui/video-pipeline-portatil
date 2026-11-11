import os
from pathlib import Path

projeto = Path(os.environ['VIDEO_PROJECT'])
build = Path(os.environ['VIDEO_BUILD'])
ffmpeg = os.environ.get('VIDEO_FFMPEG', 'ffmpeg')
ffprobe = os.environ.get('VIDEO_FFPROBE', 'ffprobe')
