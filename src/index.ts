type ScreenSize = {
  width: number;
  height: number;
};

type DrawHandler = {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  analyserNode: AnalyserNode;
  dataArray: Uint8Array;
  bufferLength: number;
};

const screenSize: ScreenSize = {
  width: 0,
  height: 0,
};

async function getMedia(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.error(err);
  }

  if (!stream) {
    throw new Error("Stream was not created");
  }

  return stream;
}

function initializeCanvas({ width, height }: ScreenSize): HTMLCanvasElement {
  const root = document.getElementById("root");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.id = "canvas";

  if (root) {
    root.appendChild(canvas);
  } else {
    throw new Error('Root was not found, ensure "Canvas" is in the HTML body');
  }

  return canvas;
}

function draw(params: DrawHandler) {
  const { canvas, canvasCtx, analyserNode, dataArray, bufferLength } = params;

  analyserNode.getByteTimeDomainData(dataArray);

  canvasCtx.clearRect(0, 0, screenSize.width, screenSize.height);
  canvas.width = canvas.width;
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = "rgb(255, 255, 255)";

  const sliceWidth = screenSize.width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * (screenSize.height / 2);

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();

  requestAnimationFrame(() => {
    draw(params);
  });
}

function resizeWindow() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  screenSize.width = document.body.clientWidth;
  screenSize.height = document.body.clientHeight;

  if (canvas) {
    canvas.width = screenSize.width;
    canvas.height = screenSize.height;
  }
}

async function main() {
  resizeWindow();

  const canvas = initializeCanvas(screenSize);
  const canvasCtx = canvas.getContext("2d");

  if (!canvasCtx) {
    throw new Error("Failed to get 2d canvas context");
  }

  window.addEventListener("resize", resizeWindow);

  canvasCtx.fillStyle = "rgba(0, 0, 0, 0)";
  canvasCtx.fillRect(0, 0, screenSize.width, screenSize.height);

  const stream = await getMedia({
    audio: true,
    video: false,
  });

  const audioCtx = new AudioContext();
  const analyserNode = audioCtx.createAnalyser();
  const distortionNode = audioCtx.createAnalyser();

  const sourceNode = audioCtx.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);
  analyserNode.connect(distortionNode);
  distortionNode.connect(audioCtx.destination);

  analyserNode.fftSize = 2048;
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  analyserNode.getByteTimeDomainData(dataArray);

  const params: DrawHandler = {
    canvas,
    canvasCtx,
    analyserNode,
    dataArray,
    bufferLength,
  };

  draw(params);
}

main()
  .then(() => { })
  .catch((err) => console.error(err));
