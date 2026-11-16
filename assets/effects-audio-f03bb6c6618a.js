"use strict";

(() => {
  const RATE = 32000, DURATION = 8.4, FADE = .035;
  const EFFECTS = ["clean", "overdrive", "distortion", "fuzz", "chorus", "delay", "reverb"];
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const validEffect = value => EFFECTS.includes(value) ? value : "clean";

  function random(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  }

  // Deterministic plucked strings: a noise-excited, damped delay line.
  // Every effect receives the exact same synthesized performance.
  function phraseSamples(phrase) {
    const samples = new Float32Array(Math.ceil(RATE * DURATION));
    function pluck(midi, at, velocity, seed) {
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      const delay = RATE / frequency - .5;
      const size = Math.max(8, Math.ceil(delay) + 2);
      const ring = new Float32Array(size), noise = random(seed);
      let mean = 0;
      for (let i = 0; i < size; i++) { ring[i] = noise() * 2 - 1; mean += ring[i]; }
      mean /= size;
      for (let i = 0; i < size; i++) ring[i] -= mean;
      // Pickup position creates a comb-like spectral shape without a recorded sample.
      const initial = ring.slice(), pickup = Math.max(1, Math.floor(size * .21));
      for (let i = 0; i < size; i++) ring[i] = .65 * (initial[i] - .55 * initial[(i + pickup) % size]);
      const start = Math.floor(at * RATE), length = Math.floor(1.95 * RATE);
      const damping = Math.exp(-2.25 / frequency);
      let index = 0, previous = 0, previousRead = 0;
      for (let i = 0; i < length && start + i < samples.length; i++) {
        const read = (index - delay + size) % size, base = Math.floor(read), fraction = read - base;
        const value = ring[base] * (1 - fraction) + ring[(base + 1) % size] * fraction;
        ring[index] = damping * .5 * (value + previousRead);
        previousRead = value;
        index = (index + 1) % size;
        const attack = Math.min(1, i / (RATE * .003));
        const release = Math.min(1, (length - i) / (RATE * .025));
        previous = .72 * value + .28 * previous;
        samples[start + i] += previous * velocity * attack * release;
      }
    }
    if (phrase === "chords") {
      const shapes = [[48,52,55,60,64], [43,47,50,55,59,67], [45,52,57,60,64], [41,48,53,57,60,65]];
      shapes.forEach((notes, bar) => {
        notes.forEach((midi, string) => pluck(midi, .06 + bar * 1.1 + string * .022, .25, 901 + bar * 37 + string));
        notes.slice().reverse().forEach((midi, string) => pluck(midi, .57 + bar * 1.1 + string * .013, .14, 2201 + bar * 41 + string));
      });
    } else {
      [52,55,57,59,60,59,57,55,52,55].forEach((midi, index) => {
        const at = .06 + index * .42 + (index >= 4 ? .42 : 0) + (index >= 8 ? .42 : 0);
        pluck(midi, at, [ .48,.38,.44,.38,.48,.4,.44,.38,.5,.4 ][index], 1201 + index * 31);
      });
    }
    let peak = 0;
    for (const value of samples) peak = Math.max(peak, Math.abs(value));
    const scale = .74 / Math.max(.001, peak);
    for (let i = 0; i < samples.length; i++) samples[i] *= scale;
    return samples;
  }

  function gain(context, amount) {
    const node = context.createGain(); node.gain.value = amount; return node;
  }

  function filter(context, type, frequency, q = .707) {
    const node = context.createBiquadFilter(); node.type = type;
    node.frequency.value = frequency; node.Q.value = q; return node;
  }

  function driveCurve(amount, fuzz) {
    const curve = new Float32Array(4096), normalizer = Math.tanh(amount);
    for (let i = 0; i < curve.length; i++) {
      const x = i * 2 / (curve.length - 1) - 1;
      curve[i] = fuzz ? Math.tanh(amount * (x + .025)) : Math.tanh(amount * x) / normalizer;
    }
    return curve;
  }

  function roomImpulse(context) {
    const impulse = context.createBuffer(2, Math.floor(2.6 * RATE), RATE);
    for (let channel = 0; channel < 2; channel++) {
      const out = impulse.getChannelData(channel), noise = random(799 + channel * 3181);
      let smooth = 0;
      for (let i = Math.floor(.019 * RATE); i < out.length; i++) {
        smooth = .58 * smooth + .42 * (noise() * 2 - 1);
        out[i] = smooth * Math.exp(-3.4 * i / out.length) * Math.min(1, i / (RATE * .035));
      }
      for (const [time, amount] of [[.029,.65],[.047,.4],[.073,.28],[.109,.16]]) out[Math.floor((time + channel * .002) * RATE)] += amount;
    }
    return impulse;
  }

  async function renderEffect(samples, effect) {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) throw new Error("Offline audio is unavailable");
    const context = new Offline(2, samples.length, RATE);
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, samples.length, RATE);
    source.buffer.getChannelData(0).set(samples);
    const input = filter(context, "highpass", 55);
    source.connect(input);
    const output = context.createGain();
    if (["overdrive", "distortion", "fuzz"].includes(effect)) {
      const pre = gain(context, effect === "overdrive" ? 1.8 : effect === "distortion" ? 3.5 : 4.6);
      const shaper = context.createWaveShaper();
      shaper.curve = driveCurve(effect === "overdrive" ? 2.5 : effect === "distortion" ? 7 : 22, effect === "fuzz");
      shaper.oversample = "4x";
      const tone = filter(context, "lowpass", effect === "overdrive" ? 5100 : effect === "distortion" ? 4400 : 3600);
      input.connect(pre).connect(shaper).connect(tone).connect(filter(context, "highpass", 65)).connect(output);
    } else if (effect === "chorus") {
      input.connect(gain(context, .66)).connect(output);
      const merge = context.createChannelMerger(2);
      for (let channel = 0; channel < 2; channel++) {
        const delay = context.createDelay(.06), lfo = context.createOscillator();
        delay.delayTime.value = channel ? .025 : .019;
        lfo.frequency.value = channel ? .93 : .71;
        lfo.connect(gain(context, channel ? .0038 : .0047)).connect(delay.delayTime);
        input.connect(delay).connect(gain(context, .48)).connect(merge, 0, channel);
        lfo.start(); lfo.stop(DURATION);
      }
      merge.connect(output);
    } else if (effect === "delay") {
      const delay = context.createDelay(1), feedback = gain(context, .43);
      delay.delayTime.value = .315;
      input.connect(gain(context, .8)).connect(output);
      input.connect(delay); delay.connect(feedback).connect(delay);
      delay.connect(gain(context, .64)).connect(output);
    } else if (effect === "reverb") {
      const reverb = context.createConvolver(); reverb.buffer = roomImpulse(context);
      input.connect(gain(context, .7)).connect(output);
      input.connect(reverb).connect(gain(context, .83)).connect(output);
    } else input.connect(output);
    const speaker = filter(context, "lowpass", 6200);
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -17; compressor.knee.value = 20; compressor.ratio.value = 2;
    compressor.attack.value = .006; compressor.release.value = .12;
    output.connect(speaker).connect(compressor).connect(context.destination);
    source.start();
    const buffer = await context.startRendering();
    let sum = 0, peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      for (const value of buffer.getChannelData(channel)) { sum += value * value; peak = Math.max(peak, Math.abs(value)); }
    }
    return {buffer, rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)), peak};
  }

  async function preparePhrase(phrase) {
    const samples = phraseSamples(phrase), renders = {};
    // Sequential offline renders avoid a burst of concurrent contexts on phones.
    for (const effect of EFFECTS) renders[effect] = await renderEffect(samples, effect);
    const target = Math.min(.13, ...EFFECTS.map(effect => .86 * renders[effect].rms / Math.max(.001, renders[effect].peak)));
    const buffers = {}, diagnostics = {};
    for (const effect of EFFECTS) {
      const item = renders[effect], scale = target / Math.max(.00001, item.rms);
      const buffer = item.buffer, endFade = Math.floor(.025 * RATE);
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] *= scale * Math.min(1, i / 160, (data.length - 1 - i) / endFade);
      }
      buffers[effect] = buffer;
      diagnostics[effect] = Object.freeze({rms: target, peak: item.peak * scale, duration: buffer.duration});
    }
    return {buffers, diagnostics: Object.freeze(diagnostics)};
  }

  function ramp(param, value, time, duration) {
    if (typeof param.cancelAndHoldAtTime === "function") param.cancelAndHoldAtTime(time);
    else { const current = param.value; param.cancelScheduledValues(time); param.setValueAtTime(current, time); }
    param.linearRampToValueAtTime(value, time + duration);
  }

  async function resume(context) {
    let timeout;
    try {
      const action = context.state === "running" ? Promise.resolve() : context.resume();
      await Promise.race([action, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Audio could not be unlocked")), 5000); })]);
      if (context.state !== "running") throw new Error("Audio is not running");
    } finally { clearTimeout(timeout); }
  }

  class Engine {
    constructor(context) {
      this.context = context;
      this.master = gain(context, .6);
      this.master.connect(context.destination);
      this.cache = new Map();
      this.run = null;
      this.epoch = 0;
      this.effect = "clean";
      this.volume = .6;
      this.lastDiagnostics = Object.freeze({});
    }
    get playing() { return Boolean(this.run?.started); }
    get duration() { return DURATION; }
    get position() { return this.run?.started ? Math.min(DURATION, Math.max(0, this.context.currentTime - this.run.start)) : 0; }
    get diagnostics() { return this.lastDiagnostics; }

    async play({phrase = "riff", effect = "clean", volume = .6, onEnded} = {}) {
      this.stop();
      const epoch = ++this.epoch;
      this.effect = validEffect(effect);
      this.setVolume(volume);
      // Invoke resume before waiting for synthesis so user activation is preserved.
      const unlocked = resume(this.context);
      const key = phrase === "chords" ? "chords" : "riff";
      if (!this.cache.has(key)) this.cache.set(key, preparePhrase(key).catch(error => { this.cache.delete(key); throw error; }));
      const [prepared] = await Promise.all([this.cache.get(key), unlocked]);
      if (epoch !== this.epoch) return;
      if (this.context.state !== "running") throw new Error("Audio became suspended");
      this.lastDiagnostics = prepared.diagnostics;
      const run = {epoch, buffers: prepared.buffers, voices: new Set(), start: this.context.currentTime + .012, started: true, onEnded};
      this.run = run;
      this.addVoice(run, this.effect, run.start, 0);
    }

    addVoice(run, effect, when, offset) {
      const source = this.context.createBufferSource(), envelope = gain(this.context, 0);
      const voice = {source, envelope, effect};
      source.buffer = run.buffers[effect]; source.connect(envelope).connect(this.master);
      envelope.gain.setValueAtTime(0, when);
      envelope.gain.linearRampToValueAtTime(1, when + FADE);
      run.voices.add(voice);
      source.onended = () => {
        run.voices.delete(voice); source.disconnect(); envelope.disconnect();
        if (this.run === run && this.context.currentTime >= run.start + DURATION - .015) {
          this.run = null;
          for (const old of run.voices) { try { old.source.stop(); } catch {} }
          if (typeof run.onEnded === "function") run.onEnded();
        }
      };
      source.start(when, offset);
    }

    setEffect(effect) {
      const next = validEffect(effect);
      if (next === this.effect) return;
      this.effect = next;
      const run = this.run;
      if (!run?.started) return;
      const when = Math.max(this.context.currentTime + .006, run.start), offset = when - run.start;
      if (offset >= DURATION - FADE) return;
      for (const voice of run.voices) {
        ramp(voice.envelope.gain, 0, when, FADE);
        try { voice.source.stop(when + FADE + .005); } catch {}
      }
      this.addVoice(run, next, when, offset);
    }

    setVolume(volume) {
      this.volume = clamp(volume);
      ramp(this.master.gain, this.volume, this.context.currentTime, .02);
    }

    stop() {
      ++this.epoch;
      const run = this.run;
      this.run = null;
      if (!run) return;
      run.onEnded = null;
      const now = this.context.currentTime;
      for (const voice of run.voices) {
        ramp(voice.envelope.gain, 0, now, FADE);
        try { voice.source.stop(now + FADE + .005); } catch {}
      }
    }
  }

  window.GuitarEffectsAudio = Object.freeze({
    async create() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("Web Audio is unavailable");
      const context = new Audio();
      try { await resume(context); return new Engine(context); }
      catch (error) { try { await context.close(); } catch {} throw error; }
    }
  });
})();
