export class AudioService {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error("Microphone permission error", err);
      return false;
    }
  }

  startRecording(onAudio: (pcm: ArrayBuffer) => void): boolean {
    if (!this.stream) return false;

    // 🔑 Create AudioContext ONLY here
    this.audioContext = new AudioContext({ sampleRate: 48000 });

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);

      const buffer = new ArrayBuffer(input.length * 2);
      const view = new DataView(buffer);

      let offset = 0;
      for (let i = 0; i < input.length; i++, offset += 2) {
        let sample = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
      }

      onAudio(buffer);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    return true;
  }

  stopRecording(): void {
    this.processor?.disconnect();
    this.source?.disconnect();

    this.processor = null;
    this.source = null;

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  cleanup(): void {
    this.stopRecording();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
