// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ArrowLeft, Server, AlertTriangle, AlignLeft, MemoryStick as MemoryStickIcon,
  Cpu, Zap, Sparkles, HardDrive, Globe, User, Radio, GitBranch, Check,
  ChevronDown, Search, Rocket, SlidersHorizontal, FastForward, Network,
  Wrench, Feather, Info, Code2, TerminalSquare, Play, ArrowRight, Zap as ZapIcon,
  Layers, Monitor
} from "lucide-react";
import { useSettings } from '../context/SettingsContext';

const RAM = [
  { v: 1, label: 'Small Testing Server' },
  { v: 2, label: 'Small Testing Server' },
  { v: 4, label: 'Starter Survival' },
  { v: 8, label: 'Medium Survival Server' },
  { v: 16, label: 'Large Community Server' },
  { v: 24, label: 'Heavy Modpack Server' },
  { v: 32, label: 'High-Traffic Network' },
  { v: 48, label: 'Enterprise Workload' },
  { v: 64, label: 'Extreme Performance' },
];

const CPU_MAP: Record<number, number> = { 1: 100, 2: 100, 4: 150, 8: 200, 16: 300, 24: 400, 32: 500, 48: 700, 64: 800 };

const MINECRAFT_SOFTWARE = [
  { id: 'paper', name: 'Paper', desc: 'High Performance', icon: ZapIcon },
  { id: 'purpur', name: 'Purpur', desc: 'Paper + Extra Features', icon: Sparkles },
  { id: 'vanilla', name: 'Vanilla', desc: 'Official Minecraft', icon: Server },
  { id: 'spigot', name: 'Spigot', desc: 'Classic Plugins', icon: Wrench },
  { id: 'fabric', name: 'Fabric', desc: 'Lightweight Mods', icon: Feather },
  { id: 'forge', name: 'Forge', desc: 'Classic Modpack', icon: Wrench },
  { id: 'bungeecord', name: 'BungeeCord', desc: 'Classic Proxy', icon: Network },
  { id: 'velocity', name: 'Velocity', desc: 'Next-gen Proxy', icon: FastForward }
];

const APPLICATION_SOFTWARE = [
  { id: 'nodejs', name: 'Node.js', desc: 'JS / TS Runtime & Discord Bots', icon: Code2 },
  { id: 'python', name: 'Python', desc: 'Python 3.x Runtime & Scripts', icon: TerminalSquare }
];

const SOFTWARE = [...MINECRAFT_SOFTWARE, ...APPLICATION_SOFTWARE];

const JAVA_VERSIONS = [
  { id: 'auto', label: 'Automatic (Recommended)', desc: 'Selected based on server software', icon: ZapIcon },
  { id: '8', label: 'Java 8', desc: 'Minecraft 1.16 and older', icon: Monitor },
  { id: '11', label: 'Java 11', desc: 'Minecraft 1.17', icon: Monitor },
  { id: '16', label: 'Java 16', desc: 'Minecraft 1.17+', icon: Monitor },
  { id: '17', label: 'Java 17', desc: 'Minecraft 1.18 - 1.20.4', icon: Monitor },
  { id: '21', label: 'Java 21', desc: 'Minecraft 1.20.5 - 1.21', icon: Monitor },
  { id: '25', label: 'Java 25', desc: 'Minecraft 1.22+', icon: Monitor },
];

const STEPS = ['IDENTITY', 'SOFTWARE', 'JAVA RUNTIME', 'RESOURCES', 'NETWORK', 'REVIEW'];

function CustomDropdown({ value, options, onChange, renderValue, renderOption, placeholder }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = options.filter((o: any) =>
    (o.label || o.name || o.value || o.v || '').toString().toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find((o: any) => (o.value || o.v) === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 text-left py-3 px-4 rounded-xl border border-zp-primary-500/20 bg-zp-bg-input text-zp-text-primary hover:border-zp-primary-500/40 transition-all outline-none"
      >
        <span className="flex items-center gap-3 min-w-0">
          {selected ? renderValue(selected) : <span className="text-zp-text-muted">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-zp-text-muted transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl bg-zp-card border border-zp-border shadow-zp-shadow-card backdrop-blur-xl overflow-hidden">
          <div className="p-2 border-b border-zp-border-subtle">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zp-text-muted" />
              <input
                autoFocus
                className="w-full bg-zp-bg-input border border-zp-border rounded-lg pl-9 pr-3 py-2 text-sm text-zp-text-primary outline-none focus:border-zp-primary-500 transition-colors"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5 custom-scrollbar">
            {filtered.length > 0 ? filtered.map((o: any, i: number) => {
              const val = o.value || o.v;
              const isSel = val === value;
              return (
                <div key={i} onClick={() => { onChange(val); setOpen(false); setSearch(''); }}>
                  {renderOption(o, isSel)}
                </div>
              );
            }) : <p className="px-4 py-3 text-xs text-zp-text-muted font-mono">No results found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const getInitials = (name: string) => name ? name.slice(0, 2).toUpperCase() : '??';

export default function CreateServer() {
  const { defaultRuntime } = useSettings();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data
  const [nodes, setNodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [versions, setVersions] = useState<string[]>([]);
  const [javaRuntimes, setJavaRuntimes] = useState<any[]>([]);

  // Form State
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [deployed, setDeployed] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [nameError, setNameError] = useState(false);
  const [dir, setDir] = useState('forward');

  const [portStatus, setPortStatus] = useState('idle');
  const portCheckIdRef = useRef(0);

  const [state, setState] = useState({
    name: '', desc: '', ram: 4, cpu: 150, disk: 10, ip: '', port: 25565, runtimeType: 'docker',
    owner: user?.id || '', node: '', software: 'paper', version: 'latest', auto: true,
    javaVersion: 'auto'
  });

  useEffect(() => {
    if (defaultRuntime) {
      setState(s => ({ ...s, runtimeType: defaultRuntime }));
    }
  }, [defaultRuntime]);

  // Fetch Java runtimes
  useEffect(() => {
    axios.get("/api/system/java-runtimes").then((res) => {
      const runtimes = Array.isArray(res.data?.versions) ? res.data.versions : [];
      setJavaRuntimes(runtimes);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentStep < 2) return;

    if (!state.port || state.port <= 0 || state.port > 65535) {
      setPortStatus('invalid');
      return;
    }

    const checkId = ++portCheckIdRef.current;
    setPortStatus('checking');

    const timer = setTimeout(() => {
      axios.get(`/api/servers/check-port?port=${state.port}`)
        .then(res => {
          if (checkId === portCheckIdRef.current) {
            setPortStatus(res.data.inUse ? 'used' : 'available');
          }
        })
        .catch(() => {
          if (checkId === portCheckIdRef.current) {
            setPortStatus('error');
          }
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [state.port, currentStep]);

  useEffect(() => {
    axios.get("/api/nodes").then((res) => {
      setNodes(res.data);
      if (res.data.length > 0 && !state.node) {
        setState(s => ({ ...s, node: res.data[0].id }));
      }
    }).catch(() => {});

    if (user?.role === "admin" || user?.role === "owner") {
      axios.get("/api/auth/users").then((res) => setUsers(res.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setState(s => ({ ...s, version: '' }));
    axios.get(`/api/system/versions?type=${state.software}`).then((res) => {
      const v = Array.isArray(res.data) ? res.data : (res.data.versions || []);
      setVersions(v);
      if (v.length > 0) {
        setState(s => ({ ...s, version: v[0] }));
      }
    }).catch(() => {
      setVersions(['latest']);
      setState(s => ({ ...s, version: 'latest' }));
    });
  }, [state.software]);

  const updateState = (key: string, val: any) => {
    setState(prev => ({ ...prev, [key]: val }));
  };

  const handleRamClick = (ramVal: number) => {
    let newCpu = state.cpu;
    if (state.auto) {
      newCpu = CPU_MAP[ramVal] || 100;
    }
    setState(prev => ({ ...prev, ram: ramVal, cpu: newCpu }));
  };

  const handleAutoToggle = () => {
    const nextAuto = !state.auto;
    setState(prev => ({
      ...prev,
      auto: nextAuto,
      cpu: nextAuto ? (CPU_MAP[prev.ram] || 100) : prev.cpu
    }));
  };

  const validateStep = async () => {
    if (currentStep === 0 && !state.name.trim()) {
      setNameError(true);
      return false;
    }

    if (currentStep === 2 && state.javaVersion === 'auto' && javaRuntimes.length === 0) {
      alert("No Java runtime detected. Please install Java first via the Java Runtime Manager.");
      return false;
    }

    if (currentStep === 4) {
      if (!state.port || state.port <= 0 || state.port > 65535) {
        alert("Please enter a valid Server Port (1-65535).");
        return false;
      }
      if (portStatus === 'used') {
        alert("Port is already in use by another server.");
        return false;
      }
      if (portStatus === 'checking') {
        return false;
      }
      if (portStatus === 'error') {
        alert("Could not verify this port. Try again.");
        return false;
      }
    }
    return true;
  };

  const showStep = (n: number) => {
    setDir(n > currentStep ? 'forward' : 'back');
    setCurrentStep(n);
    setMaxVisited(Math.max(maxVisited, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (!isValid) return;
    if (currentStep < STEPS.length - 1) {
      showStep(currentStep + 1);
    } else {
      launch();
    }
  };

  const launch = async () => {
    if (deployed) return;
    setDeployProgress(1);

    const iv = setInterval(() => {
      setDeployProgress(p => Math.min(90, p + Math.random() * 8 + 2));
    }, 280);

    try {
      const payload = {
        name: state.name,
        description: state.desc,
        ram: state.ram,
        cpuLimit: state.cpu,
        diskLimit: state.disk,
        port: state.port,
        ipAlias: state.ip,
        type: state.software,
        version: state.version,
        ownerId: state.owner || user?.id,
        runtimeType: state.runtimeType,
        nodeId: state.node,
        javaVersion: state.javaVersion
      };
      await axios.post("/api/servers", payload);

      clearInterval(iv);
      setDeployProgress(100);

      setTimeout(() => {
        setDeployed(true);
      }, 500);

      setTimeout(() => {
        navigate("/servers");
      }, 2500);

    } catch (e: any) {
      clearInterval(iv);
      setDeployProgress(0);
      alert(e.response?.data?.error || "Failed to deploy container");
    }
  };

  const renderReviewRow = (k: string, v: string) => (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zp-border last:border-b-0">
      <span className="zp-section-title text-xs">{k}</span>
      <span className="text-zp-text-secondary font-mono text-sm font-semibold truncate text-right">{v}</span>
    </div>
  );

  return (
    <div className="min-h-screen zp-bg-page text-zp-text-primary font-sans relative selection:bg-zp-primary-500/30">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-zp-primary-500/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-zp-info/05 blur-[120px] rounded-full" />
      </div>

      {/* Progress Top Bar */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-zp-primary-500 via-zp-primary-600 to-zp-info-500 z-50 transition-all duration-500 shadow-zp-shadow-glow"
        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
      />

      <div className="relative z-10">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-black/80 border-b border-zp-border backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
            <button
              onClick={() => navigate('/servers')}
              className="zp-btn-ghost flex items-center gap-2 text-xs font-semibold tracking-wider hover:text-zp-text-primary transition-colors px-3 py-1.5 rounded-xl"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> INSTANCES
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zp-primary-600 to-zp-primary-700 flex items-center justify-center shadow-zp-shadow-glow">
                <Server className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-zp-text-primary">zPanel</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-5 pt-10 pb-20">
          {/* Header Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-zp-primary-400 uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-zp-primary-500 animate-pulse" />
              NEW SERVER WIZARD
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zp-text-primary">
              Deploy Server Instance
            </h1>
            <p className="text-sm text-zp-text-muted mt-1">Configure specs, resources, network and software engine</p>
          </div>

          {/* Stepper Navigation */}
          <div className="mb-8 p-4 rounded-xl bg-zp-card border border-zp-border backdrop-blur-md">
            <div className="flex items-center justify-between">
              {STEPS.map((stepName, i) => {
                const isPassed = i < currentStep;
                const isCurrent = i === currentStep;
                return (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => { if (i <= maxVisited && i !== currentStep && !deployed) showStep(i); }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                          isPassed
                            ? 'bg-zp-primary-600 text-white shadow-zp-shadow-glow'
                            : isCurrent
                            ? 'bg-zp-primary-500/20 text-zp-primary-400 border-2 border-zp-primary-500 shadow-zp-shadow-glow'
                            : 'bg-zp-bg-input text-zp-text-muted border border-zp-border'
                        }`}
                      >
                        {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : String(i + 1).padStart(2, '0')}
                      </button>
                      <span className="hidden sm:block mt-2 text-[10px] font-semibold tracking-wider text-zp-text-muted uppercase">
                        {stepName}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-[2px] mx-2 bg-zp-border relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-zp-primary-500 to-zp-primary-700 transition-all duration-500"
                          style={{ width: i < currentStep ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Wizard Card Body */}
          <div className="rounded-xl border border-zp-border bg-zp-card backdrop-blur-xl p-6 sm:p-8 shadow-zp-shadow-card">

            {/* STEP 1: IDENTITY */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zp-border">
                  <span className="w-7 h-7 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-xs font-mono font-bold text-zp-primary-400">01</span>
                  <h2 className="text-base font-bold text-zp-text-primary tracking-wide">IDENTITY & RUNTIME</h2>
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <Server className="w-4 h-4 text-zp-primary-400" /> Instance Name <span className="text-zp-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full py-3 px-4 rounded-xl bg-zp-bg-input border ${nameError ? 'border-zp-danger/80 focus:ring-zp-danger/20' : 'border-zp-border focus:border-zp-primary-500 focus:ring-zp-primary-500/20'} text-zp-text-primary placeholder-zp-text-dim outline-none transition-all focus:ring-2`}
                    placeholder="e.g. Survival SMP, Bedwars Proxy"
                    value={state.name}
                    onChange={(e) => { updateState('name', e.target.value); setNameError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                  />
                  {nameError && (
                    <p className="mt-2 text-xs text-zp-danger flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Instance name is required.
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <AlignLeft className="w-4 h-4 text-zp-primary-400" /> Description
                  </label>
                  <textarea
                    className="w-full py-3 px-4 rounded-xl bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 focus:ring-2 focus:ring-zp-primary-500/20 text-zp-text-primary placeholder-zp-text-dim outline-none transition-all min-h-[90px] resize-y"
                    placeholder="Short description of this server (optional)"
                    value={state.desc}
                    onChange={(e) => updateState('desc', e.target.value)}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <Cpu className="w-4 h-4 text-zp-primary-400" /> Execution Runtime
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateState('runtimeType', 'docker')}
                      className={`relative p-5 rounded-xl border text-left transition-all ${
                        state.runtimeType === 'docker'
                          ? 'border-zp-primary-500 bg-zp-primary-500/15 shadow-zp-shadow-glow'
                          : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-zp-text-primary">Docker Container</span>
                        {state.runtimeType === 'docker' && (
                          <span className="w-5 h-5 rounded-full bg-zp-primary-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zp-text-muted leading-relaxed">
                        Isolated sandbox environment with strict resource limits and full container socket support.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateState('runtimeType', 'local')}
                      className={`relative p-5 rounded-xl border text-left transition-all ${
                        state.runtimeType === 'local'
                          ? 'border-zp-primary-500 bg-zp-primary-500/15 shadow-zp-shadow-glow'
                          : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-zp-text-primary">Local Process</span>
                        {state.runtimeType === 'local' && (
                          <span className="w-5 h-5 rounded-full bg-zp-primary-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zp-text-muted leading-relaxed">
                        Direct system process execution. Ideal for bare-metal VPS without Docker installed.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SOFTWARE */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zp-border">
                  <span className="w-7 h-7 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-xs font-mono font-bold text-zp-primary-400">02</span>
                  <h2 className="text-base font-bold text-zp-text-primary tracking-wide">SOFTWARE & ENGINES</h2>
                </div>

                <div>
                  <h3 className="zp-section-title text-xs">Minecraft Engines</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {MINECRAFT_SOFTWARE.map(s => {
                      const Icon = s.icon;
                      const isSel = state.software === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => updateState('software', s.id)}
                          className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                            isSel
                              ? 'border-zp-primary-500 bg-zp-primary-500/15 shadow-zp-shadow-glow'
                              : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-3 ${isSel ? 'text-zp-primary-400' : 'text-zp-text-muted'}`} />
                          <span className="font-bold text-sm text-zp-text-primary">{s.name}</span>
                          <span className="text-[10px] text-zp-text-muted mt-1 leading-tight">{s.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="zp-section-title text-xs">Application & Script Runtimes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {APPLICATION_SOFTWARE.map(s => {
                      const Icon = s.icon;
                      const isSel = state.software === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => updateState('software', s.id)}
                          className={`p-4 rounded-xl border flex items-center gap-4 text-left transition-all ${
                            isSel
                              ? 'border-zp-primary-500 bg-zp-primary-500/15 shadow-zp-shadow-glow'
                              : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSel ? 'bg-zp-primary-500/30 text-zp-primary-400' : 'bg-zp-bg-input/50 text-zp-text-muted'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-zp-text-primary">{s.name}</span>
                            <span className="text-xs text-zp-text-muted block mt-0.5">{s.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <GitBranch className="w-4 h-4 text-zp-primary-400" />
                    {['nodejs', 'python'].includes(state.software) ? 'Runtime Version' : 'Software Version'} (Auto-Installs on Creation)
                  </label>
                  <CustomDropdown
                    value={state.version}
                    options={versions.map(v => ({ v, label: v }))}
                    onChange={(v: string) => updateState('version', v)}
                    placeholder="Select a version..."
                    renderValue={(o: any) => (
                      <>
                        <GitBranch className="w-4 h-4 text-zp-primary-400 shrink-0" />
                        <span className="font-mono text-zp-text-primary text-sm">{o.label}</span>
                      </>
                    )}
                    renderOption={(o: any, sel: boolean) => (
                      <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-sm transition-colors ${sel ? 'text-zp-text-primary bg-zp-primary-500/20' : 'text-zp-text-muted hover:bg-zp-bg-hover'}`}>
                        <span>{o.label}</span>
                        {sel && <Check className="w-4 h-4 text-zp-primary-400" />}
                      </button>
                    )}
                  />
                  <p className="text-xs text-zp-primary-400/80 mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Selected version will automatically install during deployment.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: JAVA RUNTIME */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zp-border">
                  <span className="w-7 h-7 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-xs font-mono font-bold text-zp-primary-400">03</span>
                  <h2 className="text-base font-bold text-zp-text-primary tracking-wide">JAVA RUNTIME SELECTION</h2>
                </div>

                <p className="text-sm text-zp-text-muted">
                  Select the Java runtime for this Minecraft server. <span className="text-zp-primary-400 font-medium">Automatic</span> selects the optimal version based on your chosen software.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {JAVA_VERSIONS.map(j => {
                    const Icon = j.icon;
                    const isSel = state.javaVersion === j.id;
                    const isInstalled = javaRuntimes.some(r => r.version === j.id);
                    return (
                      <button
                        key={j.id}
                        type="button"
                        disabled={j.id !== 'auto' && !isInstalled}
                        onClick={() => updateState('javaVersion', j.id)}
                        className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                          isSel
                            ? 'border-zp-primary-500 bg-zp-primary-500/15 shadow-zp-shadow-glow'
                            : !isInstalled && j.id !== 'auto'
                              ? 'border-zp-border/30 bg-zp-bg-input/50 text-zp-text-muted/40 cursor-not-allowed'
                              : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 shrink-0 ${
                          isSel ? 'bg-zp-primary-500/30 text-zp-primary-400' :
                          !isInstalled && j.id !== 'auto' ? 'bg-zp-bg-input/50 text-zp-text-muted/40' :
                          'bg-zp-bg-input/50 text-zp-text-muted'
                        }`}
                        >
                          <Icon className={`w-5 h-5`} />
                          {!isInstalled && j.id !== 'auto' && (
                            <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-zp-text-dim animate-pulse" />
                          )}
                        </div>
                        <span className="font-bold text-sm text-zp-text-primary">{j.label}</span>
                        <span className="text-[10px] text-zp-text-muted mt-1 leading-tight">{j.desc}</span>
                        {!isInstalled && j.id !== 'auto' && (
                          <span className="text-[9px] text-zp-danger mt-1 font-mono">Not installed</span>
                        )}
                        {isInstalled && !isSel && (
                          <span className="text-[9px] text-zp-success mt-1 font-mono">Available</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {state.javaVersion !== 'auto' && !javaRuntimes.some(r => r.version === state.javaVersion) && (
                  <div className="p-3 rounded-xl border border-zp-danger/30 bg-zp-danger/10 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-zp-danger" />
                    <div>
                      <p className="text-xs font-medium text-zp-danger">Java {state.javaVersion} is not installed</p>
                      <p className="text-[10px] text-zp-danger/80">Install Java {state.javaVersion} via the Java Runtime Manager before creating this server.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: RESOURCES */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zp-border">
                  <span className="w-7 h-7 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-xs font-mono font-bold text-zp-primary-400">04</span>
                  <h2 className="text-base font-bold text-zp-text-primary tracking-wide">RESOURCE ALLOCATION</h2>
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <MemoryStickIcon className="w-4 h-4 text-zp-primary-400" /> RAM Allocation (GB)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {RAM.map(r => (
                      <button
                        key={r.v}
                        type="button"
                        onClick={() => handleRamClick(r.v)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          r.v === state.ram
                            ? 'border-zp-primary-500 bg-zp-primary-500/15 shadow-zp-shadow-glow'
                            : 'border-zp-border bg-zp-bg-input hover:border-zp-primary-500/30'
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-extrabold text-zp-text-primary">
                            {r.v} <span className="text-xs font-normal text-zp-text-muted">GB</span>
                          </span>
                          {r.v === state.ram && (
                            <span className="w-4 h-4 rounded-full bg-zp-primary-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zp-text-muted mt-1.5 truncate">{r.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="flex items-center gap-2 zp-section-title text-xs">
                      <Cpu className="w-4 h-4 text-zp-primary-400" /> CPU Limit (%)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number" min="10"
                          className="w-full py-3 px-4 rounded-xl bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 text-zp-text-primary font-mono outline-none"
                          value={state.cpu}
                          onChange={(e) => { updateState('cpu', Number(e.target.value)); updateState('auto', false); }}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zp-text-muted font-mono">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoToggle}
                        className={`px-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 border ${
                          state.auto
                            ? 'bg-zp-primary-600 text-white border-zp-primary-600 shadow-zp-shadow-glow'
                            : 'bg-transparent text-zp-text-muted border-zp-border hover:border-zp-primary-500/40'
                        }`}
                      >
                        {state.auto ? <><ZapIcon className="w-3.5 h-3.5" /> AUTO</> : <><SlidersHorizontal className="w-3.5 h-3.5" /> MANUAL</>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 zp-section-title text-xs">
                      <HardDrive className="w-4 h-4 text-zp-primary-400" /> Disk Limit (GB)
                    </label>
                    <div className="relative">
                      <input
                        type="number" min="1"
                        className="w-full py-3 px-4 rounded-xl bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 text-zp-text-primary font-mono outline-none"
                        value={state.disk}
                        onChange={(e) => updateState('disk', Number(e.target.value))}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zp-text-muted font-mono">GB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: NETWORK */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zp-border">
                  <span className="w-7 h-7 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-xs font-mono font-bold text-zp-primary-400">05</span>
                  <h2 className="text-base font-bold text-zp-text-primary tracking-wide">NETWORK CONFIGURATION</h2>
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <Network className="w-4 h-4 text-zp-primary-400" /> Server Port
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={`w-full py-3 px-4 rounded-xl bg-zp-bg-input border ${
                        portStatus === 'used' || portStatus === 'invalid'
                          ? 'border-zp-danger/80 focus:ring-zp-danger/20'
                          : portStatus === 'available'
                          ? 'border-zp-success/80 focus:ring-zp-success/20'
                          : 'border-zp-border focus:border-zp-primary-500'
                      } text-zp-text-primary font-mono outline-none transition-all pr-28`}
                      placeholder="25565"
                      value={state.port || ''}
                      onChange={e => updateState('port', e.target.value ? Number(e.target.value) : '')}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold flex items-center">
                      {portStatus === 'checking' && <span className="text-zp-text-muted">CHECKING…</span>}
                      {portStatus === 'available' && <span className="text-zp-success">AVAILABLE</span>}
                      {portStatus === 'used' && <span className="text-zp-danger">IN USE</span>}
                      {portStatus === 'invalid' && <span className="text-zp-danger">INVALID</span>}
                      {portStatus === 'error' && <span className="text-zp-warning">ERROR</span>}
                    </div>
                  </div>
                  <p className="text-xs text-zp-text-muted mt-1.5">Primary listening port for player or HTTP connections</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 zp-section-title text-xs">
                    <Globe className="w-4 h-4 text-zp-primary-400" /> IP Alias / Domain
                  </label>
                  <input
                    type="text"
                    className="w-full py-3 px-4 rounded-xl bg-zp-bg-input border border-zp-border focus:border-zp-primary-500 text-zp-text-primary font-mono outline-none"
                    placeholder="play.example.com"
                    value={state.ip}
                    onChange={e => updateState('ip', e.target.value)}
                  />
                  <p className="text-xs text-zp-text-muted mt-1.5">Optional friendly hostname displayed in server connection badge</p>
                </div>

                {(user?.role === "admin" || user?.role === "owner") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="flex items-center gap-2 zp-section-title text-xs">
                        <User className="w-4 h-4 text-zp-primary-400" /> Server Owner
                      </label>
                      <CustomDropdown
                        value={state.owner}
                        options={users.map(u => ({ v: u.id, name: u.username, tag: u.role, role: u.role }))}
                        onChange={(v: string) => updateState('owner', v)}
                        placeholder="Select an owner..."
                        renderValue={(o: any) => (
                          <>
                            <span className="w-7 h-7 rounded-lg bg-zp-primary-600/20 border border-zp-primary-500/20 flex items-center justify-center font-bold text-xs text-zp-primary-300 shrink-0">
                              {getInitials(o.name)}
                            </span>
                            <span className="truncate text-zp-text-primary text-sm">{o.name} <span className="text-zp-text-muted">({o.tag})</span></span>
                          </>
                        )}
                        renderOption={(o: any, sel: boolean) => (
                          <button type="button" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${sel ? 'bg-zp-primary-500/20 text-zp-text-primary' : 'text-zp-text-muted hover:bg-zp-bg-hover'}`}>
                            <span className="w-7 h-7 rounded-lg bg-zp-primary-600/20 border border-zp-primary-500/20 flex items-center justify-center font-bold text-xs text-zp-primary-300 shrink-0">
                              {getInitials(o.name)}
                            </span>
                            <div className="flex-1 text-left">
                              <span className="block text-sm text-zp-text-primary font-medium">{o.name}</span>
                              <span className="block text-[11px] text-zp-text-muted capitalize">{o.role}</span>
                            </div>
                            {sel && <Check className="w-4 h-4 text-zp-primary-400" />}
                          </button>
                        )}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 zp-section-title text-xs">
                        <Radio className="w-4 h-4 text-zp-primary-400" /> Deployment Node
                      </label>
                      <CustomDropdown
                        value={state.node}
                        options={nodes.map(n => ({ v: n.id, label: n.name + ' (' + n.ip + ')' }))}
                        onChange={(v: string) => updateState('node', v)}
                        placeholder="Select a node..."
                        renderValue={(o: any) => (
                          <>
                            <Radio className="w-4 h-4 text-zp-primary-400 shrink-0" />
                            <span className="text-zp-text-primary truncate font-mono text-sm">{o.label}</span>
                          </>
                        )}
                        renderOption={(o: any, sel: boolean) => (
                          <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-sm transition-colors ${sel ? 'text-zp-text-primary bg-zp-primary-500/20' : 'text-zp-text-muted hover:bg-zp-bg-hover'}`}>
                            <span>{o.label}</span>
                            {sel && <Check className="w-4 h-4 text-zp-primary-400" />}
                          </button>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: REVIEW */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-zp-border">
                  <span className="w-7 h-7 rounded-lg bg-zp-primary-500/10 border border-zp-primary-500/20 flex items-center justify-center text-xs font-mono font-bold text-zp-primary-400">06</span>
                  <h2 className="text-base font-bold text-zp-text-primary tracking-wide">FINAL SPECIFICATION & DEPLOY</h2>
                </div>

                {!deployed && deployProgress === 0 && (
                  <div className="rounded-xl border border-zp-border bg-zp-bg-input overflow-hidden">
                    {renderReviewRow('INSTANCE NAME', state.name || '—')}
                    {renderReviewRow('RUNTIME', state.runtimeType === 'local' ? 'Local Process' : 'Docker Container')}
                    {renderReviewRow('JAVA VERSION', state.javaVersion === 'auto' ? 'Automatic' : `Java ${state.javaVersion}`)}
                    {renderReviewRow('PORT', String(state.port))}
                    {renderReviewRow('RAM LIMIT', `${state.ram} GB`)}
                    {renderReviewRow('CPU LIMIT', `${state.cpu}% ${state.auto ? '(Auto-Tuned)' : '(Manual)'}`)}
                    {renderReviewRow('DISK LIMIT', `${state.disk} GB`)}
                    {renderReviewRow('SOFTWARE ENGINE', SOFTWARE.find(s => s.id === state.software)?.name || state.software)}
                    {renderReviewRow('VERSION (AUTO-INSTALL)', state.version || 'latest')}
                    {state.ip && renderReviewRow('IP ALIAS', state.ip)}

                    <div className="p-4 border-t border-zp-border bg-zp-primary-500/5">
                      <div className="flex justify-between text-xs text-zp-text-muted mb-2 font-medium">
                        <span>Host Resource Footprint</span>
                        <span>{Math.min(100, Math.round(state.ram / 32 * 100))}%</span>
                      </div>
                      <div className="w-full bg-zp-border h-2 rounded-full overflow-hidden border-zp-border">
                        <div
                          className="h-full bg-gradient-to-r from-zp-primary-500 to-zp-info-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round(state.ram / 32 * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {deployProgress > 0 && !deployed && (
                  <div className="p-6 rounded-xl border border-zp-primary-500/30 bg-zp-primary-500/5 text-center">
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-zp-text-muted">Deploying and installing {state.software} ({state.version})…</span>
                      <span className="font-mono font-bold text-zp-primary-400">{Math.round(deployProgress)}%</span>
                    </div>
                    <div className="w-full bg-zp-border h-2.5 rounded-full overflow-hidden border-zp-border">
                      <div
                        className="h-full bg-gradient-to-r from-zp-primary-600 via-zp-primary-500 to-zp-info-500 transition-all duration-300 rounded-full"
                        style={{ width: `${deployProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {deployed && (
                  <div className="p-8 rounded-xl border border-zp-success/40 bg-zp-success/10 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-zp-success/20 border border-zp-success/40 text-zp-success flex items-center justify-center">
                      <Check className="w-7 h-7 stroke-[3]" />
                    </div>
                    <h3 className="text-xl font-bold text-zp-text-primary">Server Successfully Deployed!</h3>
                    <p className="text-sm text-zp-text-muted mt-1">Redirecting to servers dashboard…</p>
                  </div>
                )}
              </div>
            )}

            {/* Step Navigation Actions */}
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-zp-border">
              <button
                type="button"
                onClick={() => { if (currentStep > 0) showStep(currentStep - 1); }}
                disabled={currentStep === 0 || deployed || deployProgress > 0}
                className="zp-btn-ghost px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <span className="text-xs text-zp-text-muted font-mono hidden sm:block">
                Step {currentStep + 1} of {STEPS.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                disabled={deployed || deployProgress > 0}
                className="zp-btn-primary px-7 py-2.5 text-sm font-bold tracking-wide shadow-zp-shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 active:scale-95"
              >
                <span>{currentStep === STEPS.length - 1 ? (deployed ? 'Deployed' : 'Deploy Server') : 'Continue'}</span>
                {currentStep === STEPS.length - 1 ? <Rocket className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
