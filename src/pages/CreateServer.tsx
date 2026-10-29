// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  ArrowLeft, Server, AlertTriangle, AlignLeft, MemoryStick as MemoryStickIcon,
  Cpu, Zap, Sparkles, HardDrive, Globe, User, Radio, GitBranch, Check,
  ChevronDown, Search, Rocket, SlidersHorizontal, FastForward, Network,
  Wrench, Feather, Info, Code2, TerminalSquare
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
  { id: 'paper', name: 'Paper', desc: 'High Performance', icon: Zap },
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
const STEPS = ['IDENTITY', 'RESOURCES', 'ACCESS', 'SOFTWARE', 'REVIEW'];

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
        className="w-full flex items-center justify-between gap-3 text-left py-3 px-4 rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(6,9,26,0.7)] text-[#f0f4ff] hover:border-[rgba(139,92,246,0.4)] transition-all outline-none"
      >
        <span className="flex items-center gap-3 min-w-0">
          {selected ? renderValue(selected) : <span className="text-[#64748b]">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl bg-[rgba(10,14,36,0.95)] border border-[rgba(139,92,246,0.25)] shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-2 border-b border-[rgba(139,92,246,0.15)]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                autoFocus
                className="w-full bg-[rgba(6,9,26,0.8)] border border-[rgba(139,92,246,0.2)] rounded-lg pl-9 pr-3 py-2 text-sm text-[#f0f4ff] outline-none focus:border-[#8b5cf6] transition-colors"
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
            }) : <p className="px-4 py-3 text-xs text-[#64748b] font-mono">No results found</p>}
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
    owner: user?.id || '', node: '', software: 'paper', version: 'latest', auto: true
  });

  useEffect(() => {
    if (defaultRuntime) {
      setState(s => ({ ...s, runtimeType: defaultRuntime }));
    }
  }, [defaultRuntime]);

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

    if (currentStep === 2) {
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
        nodeId: state.node
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
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[rgba(139,92,246,0.1)] last:border-b-0">
      <span className="text-[#64748b] tracking-wider text-xs uppercase font-medium">{k}</span>
      <span className="text-[#f0f4ff] text-right font-mono text-sm font-semibold truncate">{v}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06091a] text-[#f0f4ff] font-sans relative selection:bg-purple-600/30">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-cyan-500/05 blur-[120px] rounded-full" />
      </div>

      {/* Progress Top Bar */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 z-50 transition-all duration-500 shadow-[0_0_12px_rgba(139,92,246,0.7)]"
        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
      />

      <div className="relative z-10">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 bg-[rgba(8,12,31,0.85)] border-b border-[rgba(139,92,246,0.18)] backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
            <button
              onClick={() => navigate('/servers')}
              className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#94a3b8] hover:text-[#f0f4ff] transition-colors px-3 py-1.5 rounded-lg border border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.5)] hover:border-[rgba(139,92,246,0.35)]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> INSTANCES
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                <Server className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-white">zPanel</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-5 pt-10 pb-20">
          {/* Header Title */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-[#a78bfa] uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              NEW SERVER WIZARD
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f0f4ff]">
              Deploy Server Instance
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1">Configure specs, resources, network and software engine</p>
          </div>

          {/* Stepper Navigation */}
          <div className="mb-8 p-4 rounded-2xl bg-[rgba(10,14,36,0.7)] border border-[rgba(139,92,246,0.18)] backdrop-blur-md">
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
                            ? 'bg-[#7c3aed] text-white shadow-[0_0_16px_rgba(124,58,237,0.4)]'
                            : isCurrent
                            ? 'bg-[rgba(124,58,237,0.2)] text-[#a78bfa] border-2 border-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                            : 'bg-[rgba(6,9,26,0.6)] text-[#64748b] border border-[rgba(139,92,246,0.15)]'
                        }`}
                      >
                        {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : String(i + 1).padStart(2, '0')}
                      </button>
                      <span className="hidden sm:block mt-2 text-[10px] font-semibold tracking-wider text-[#64748b] uppercase">
                        {stepName}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-[2px] mx-2 bg-[rgba(139,92,246,0.15)] relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
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
          <div className="rounded-2xl border border-[rgba(139,92,246,0.22)] bg-[rgba(10,14,36,0.85)] backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_50px_-20px_rgba(124,58,237,0.2)]">

            {/* STEP 1: IDENTITY */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[rgba(139,92,246,0.15)]">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold text-purple-400">01</span>
                  <h2 className="text-base font-bold text-white tracking-wide">IDENTITY & RUNTIME</h2>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    <Server className="w-4 h-4 text-purple-400" /> Instance Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full py-3 px-4 rounded-xl bg-[rgba(6,9,26,0.7)] border ${nameError ? 'border-rose-500 focus:ring-rose-500/20' : 'border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] focus:ring-purple-500/20'} text-[#f0f4ff] placeholder-[#475569] outline-none transition-all focus:ring-2`}
                    placeholder="e.g. Survival SMP, Bedwars Proxy"
                    value={state.name}
                    onChange={(e) => { updateState('name', e.target.value); setNameError(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                  />
                  {nameError && (
                    <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Instance name is required.
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    <AlignLeft className="w-4 h-4 text-purple-400" /> Description
                  </label>
                  <textarea
                    className="w-full py-3 px-4 rounded-xl bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] focus:ring-2 focus:ring-purple-500/20 text-[#f0f4ff] placeholder-[#475569] outline-none transition-all min-h-[90px] resize-y"
                    placeholder="Short description of this server (optional)"
                    value={state.desc}
                    onChange={(e) => updateState('desc', e.target.value)}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
                    <Cpu className="w-4 h-4 text-purple-400" /> Execution Runtime
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateState('runtimeType', 'docker')}
                      className={`relative p-5 rounded-xl border text-left transition-all ${
                        state.runtimeType === 'docker'
                          ? 'border-[#8b5cf6] bg-[rgba(124,58,237,0.15)] shadow-[0_0_24px_-6px_rgba(124,58,237,0.4)]'
                          : 'border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] hover:border-[rgba(139,92,246,0.35)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[#f0f4ff]">Docker Container</span>
                        {state.runtimeType === 'docker' && (
                          <span className="w-5 h-5 rounded-full bg-[#7c3aed] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94a3b8] leading-relaxed">
                        Isolated sandbox environment with strict resource limits and full container socket support.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateState('runtimeType', 'local')}
                      className={`relative p-5 rounded-xl border text-left transition-all ${
                        state.runtimeType === 'local'
                          ? 'border-[#8b5cf6] bg-[rgba(124,58,237,0.15)] shadow-[0_0_24px_-6px_rgba(124,58,237,0.4)]'
                          : 'border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] hover:border-[rgba(139,92,246,0.35)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-[#f0f4ff]">Local Process</span>
                        {state.runtimeType === 'local' && (
                          <span className="w-5 h-5 rounded-full bg-[#7c3aed] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#94a3b8] leading-relaxed">
                        Direct system process execution. Ideal for bare-metal VPS without Docker installed.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: RESOURCES */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[rgba(139,92,246,0.15)]">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold text-purple-400">02</span>
                  <h2 className="text-base font-bold text-white tracking-wide">RESOURCE ALLOCATION</h2>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
                    <MemoryStickIcon className="w-4 h-4 text-purple-400" /> RAM Allocation (GB)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {RAM.map(r => (
                      <button
                        key={r.v}
                        type="button"
                        onClick={() => handleRamClick(r.v)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          r.v === state.ram
                            ? 'border-[#8b5cf6] bg-[rgba(124,58,237,0.18)] shadow-[0_0_20px_-4px_rgba(124,58,237,0.5)]'
                            : 'border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] hover:border-[rgba(139,92,246,0.35)]'
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-extrabold text-[#f0f4ff]">
                            {r.v} <span className="text-xs font-normal text-[#94a3b8]">GB</span>
                          </span>
                          {r.v === state.ram && (
                            <span className="w-4 h-4 rounded-full bg-[#7c3aed] text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#94a3b8] mt-1.5 truncate">{r.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                      <Cpu className="w-4 h-4 text-purple-400" /> CPU Limit (%)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number" min="10"
                          className="w-full py-3 px-4 rounded-xl bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] text-[#f0f4ff] font-mono outline-none"
                          value={state.cpu}
                          onChange={(e) => { updateState('cpu', Number(e.target.value)); updateState('auto', false); }}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b] font-mono">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoToggle}
                        className={`px-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 border ${
                          state.auto
                            ? 'bg-[#7c3aed] text-white border-[#7c3aed] shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                            : 'bg-transparent text-[#94a3b8] border-[rgba(139,92,246,0.2)] hover:border-[rgba(139,92,246,0.4)]'
                        }`}
                      >
                        {state.auto ? <><Zap className="w-3.5 h-3.5" /> AUTO</> : <><SlidersHorizontal className="w-3.5 h-3.5" /> MANUAL</>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                      <HardDrive className="w-4 h-4 text-purple-400" /> Disk Limit (GB)
                    </label>
                    <div className="relative">
                      <input
                        type="number" min="1"
                        className="w-full py-3 px-4 rounded-xl bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] text-[#f0f4ff] font-mono outline-none"
                        value={state.disk}
                        onChange={(e) => updateState('disk', Number(e.target.value))}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748b] font-mono">GB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: NETWORK & ACCESS */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[rgba(139,92,246,0.15)]">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold text-purple-400">03</span>
                  <h2 className="text-base font-bold text-white tracking-wide">NETWORK & ACCESS</h2>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    <Network className="w-4 h-4 text-purple-400" /> Server Port
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className={`w-full py-3 px-4 rounded-xl bg-[rgba(6,9,26,0.7)] border ${
                        portStatus === 'used' || portStatus === 'invalid'
                          ? 'border-rose-500/80 focus:ring-rose-500/20'
                          : portStatus === 'available'
                          ? 'border-emerald-500/80 focus:ring-emerald-500/20'
                          : 'border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6]'
                      } text-[#f0f4ff] font-mono outline-none transition-all pr-28`}
                      placeholder="25565"
                      value={state.port || ''}
                      onChange={e => updateState('port', e.target.value ? Number(e.target.value) : '')}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold flex items-center">
                      {portStatus === 'checking' && <span className="text-[#94a3b8]">CHECKING…</span>}
                      {portStatus === 'available' && <span className="text-emerald-400">AVAILABLE</span>}
                      {portStatus === 'used' && <span className="text-rose-400">IN USE</span>}
                      {portStatus === 'invalid' && <span className="text-rose-400">INVALID</span>}
                      {portStatus === 'error' && <span className="text-amber-400">ERROR</span>}
                    </div>
                  </div>
                  <p className="text-xs text-[#64748b] mt-1.5">Primary listening port for player or HTTP connections</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    <Globe className="w-4 h-4 text-purple-400" /> IP Alias / Domain
                  </label>
                  <input
                    type="text"
                    className="w-full py-3 px-4 rounded-xl bg-[rgba(6,9,26,0.7)] border border-[rgba(139,92,246,0.2)] focus:border-[#8b5cf6] text-[#f0f4ff] font-mono outline-none"
                    placeholder="play.example.com"
                    value={state.ip}
                    onChange={e => updateState('ip', e.target.value)}
                  />
                  <p className="text-xs text-[#64748b] mt-1.5">Optional friendly hostname displayed in server connection badge</p>
                </div>

                {(user?.role === "admin" || user?.role === "owner") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                        <User className="w-4 h-4 text-purple-400" /> Server Owner
                      </label>
                      <CustomDropdown
                        value={state.owner}
                        options={users.map(u => ({ v: u.id, name: u.username, tag: u.role, role: u.role }))}
                        onChange={(v: string) => updateState('owner', v)}
                        placeholder="Select an owner..."
                        renderValue={(o: any) => (
                          <>
                            <span className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                              {getInitials(o.name)}
                            </span>
                            <span className="truncate text-white text-sm">{o.name} <span className="text-[#64748b]">({o.tag})</span></span>
                          </>
                        )}
                        renderOption={(o: any, sel: boolean) => (
                          <button type="button" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${sel ? 'bg-purple-600/20 text-white' : 'text-[#94a3b8] hover:bg-white/5'}`}>
                            <span className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                              {getInitials(o.name)}
                            </span>
                            <div className="flex-1 text-left">
                              <span className="block text-sm text-white font-medium">{o.name}</span>
                              <span className="block text-[11px] text-[#64748b] capitalize">{o.role}</span>
                            </div>
                            {sel && <Check className="w-4 h-4 text-purple-400" />}
                          </button>
                        )}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                        <Radio className="w-4 h-4 text-purple-400" /> Deployment Node
                      </label>
                      <CustomDropdown
                        value={state.node}
                        options={nodes.map(n => ({ v: n.id, label: n.name + ' (' + n.ip + ')' }))}
                        onChange={(v: string) => updateState('node', v)}
                        placeholder="Select a node..."
                        renderValue={(o: any) => (
                          <>
                            <Radio className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="text-white truncate font-mono text-sm">{o.label}</span>
                          </>
                        )}
                        renderOption={(o: any, sel: boolean) => (
                          <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-sm transition-colors ${sel ? 'text-white bg-purple-600/20' : 'text-[#94a3b8] hover:bg-white/5'}`}>
                            <span>{o.label}</span>
                            {sel && <Check className="w-4 h-4 text-purple-400" />}
                          </button>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: SOFTWARE */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[rgba(139,92,246,0.15)]">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold text-purple-400">04</span>
                  <h2 className="text-base font-bold text-white tracking-wide">SOFTWARE & ENGINES</h2>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Minecraft Engines</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                              ? 'border-[#8b5cf6] bg-[rgba(124,58,237,0.18)] shadow-[0_0_20px_-4px_rgba(124,58,237,0.5)]'
                              : 'border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] hover:border-[rgba(139,92,246,0.35)]'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isSel ? 'text-purple-400' : 'text-[#64748b]'}`} />
                          <span className="font-bold text-sm text-[#f0f4ff]">{s.name}</span>
                          <span className="text-[10px] text-[#94a3b8] mt-1 leading-tight">{s.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-3">Application & Script Runtimes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              ? 'border-[#8b5cf6] bg-[rgba(124,58,237,0.18)] shadow-[0_0_20px_-4px_rgba(124,58,237,0.5)]'
                              : 'border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] hover:border-[rgba(139,92,246,0.35)]'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSel ? 'bg-purple-600/30 text-purple-300' : 'bg-white/5 text-[#64748b]'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#f0f4ff]">{s.name}</span>
                            <span className="text-xs text-[#94a3b8] block mt-0.5">{s.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    {['nodejs', 'python'].includes(state.software) ? 'Runtime Version' : 'Software Version'} (Auto-Installs on Creation)
                  </label>
                  <CustomDropdown
                    value={state.version}
                    options={versions.map(v => ({ v, label: v }))}
                    onChange={(v: string) => updateState('version', v)}
                    placeholder="Select a version..."
                    renderValue={(o: any) => (
                      <>
                        <GitBranch className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="font-mono text-white text-sm">{o.label}</span>
                      </>
                    )}
                    renderOption={(o: any, sel: boolean) => (
                      <button type="button" className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-sm transition-colors ${sel ? 'text-white bg-purple-600/20' : 'text-[#94a3b8] hover:bg-white/5'}`}>
                        <span>{o.label}</span>
                        {sel && <Check className="w-4 h-4 text-purple-400" />}
                      </button>
                    )}
                  />
                  <p className="text-xs text-purple-400/80 mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Selected version will automatically install during deployment.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[rgba(139,92,246,0.15)]">
                  <span className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold text-purple-400">05</span>
                  <h2 className="text-base font-bold text-white tracking-wide">FINAL SPECIFICATION & DEPLOY</h2>
                </div>

                {!deployed && deployProgress === 0 && (
                  <div className="rounded-xl border border-[rgba(139,92,246,0.18)] bg-[rgba(6,9,26,0.6)] overflow-hidden">
                    {renderReviewRow('INSTANCE NAME', state.name || '—')}
                    {renderReviewRow('RUNTIME', state.runtimeType === 'local' ? 'Local Process' : 'Docker Container')}
                    {renderReviewRow('PORT', String(state.port))}
                    {renderReviewRow('RAM LIMIT', `${state.ram} GB`)}
                    {renderReviewRow('CPU LIMIT', `${state.cpu}% ${state.auto ? '(Auto-Tuned)' : '(Manual)'}`)}
                    {renderReviewRow('DISK LIMIT', `${state.disk} GB`)}
                    {renderReviewRow('SOFTWARE ENGINE', SOFTWARE.find(s => s.id === state.software)?.name || state.software)}
                    {renderReviewRow('VERSION (AUTO-INSTALL)', state.version || 'latest')}
                    {state.ip && renderReviewRow('IP ALIAS', state.ip)}

                    <div className="p-4 border-t border-[rgba(139,92,246,0.15)] bg-[rgba(124,58,237,0.05)]">
                      <div className="flex justify-between text-xs text-[#94a3b8] mb-2 font-medium">
                        <span>Host Resource Footprint</span>
                        <span>{Math.min(100, Math.round(state.ram / 32 * 100))}%</span>
                      </div>
                      <div className="w-full bg-[rgba(6,9,26,0.8)] h-2 rounded-full overflow-hidden border border-[rgba(139,92,246,0.15)]">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round(state.ram / 32 * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {deployProgress > 0 && !deployed && (
                  <div className="p-6 rounded-xl border border-[rgba(139,92,246,0.3)] bg-[rgba(6,9,26,0.8)] text-center">
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-[#94a3b8]">Deploying and installing {state.software} ({state.version})…</span>
                      <span className="font-mono font-bold text-purple-400">{Math.round(deployProgress)}%</span>
                    </div>
                    <div className="w-full bg-[rgba(10,14,36,0.9)] h-2.5 rounded-full overflow-hidden border border-[rgba(139,92,246,0.2)]">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                        style={{ width: `${deployProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {deployed && (
                  <div className="p-8 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <Check className="w-7 h-7 stroke-[3]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#f0f4ff]">Server Successfully Deployed!</h3>
                    <p className="text-sm text-[#94a3b8] mt-1">Redirecting to servers dashboard…</p>
                  </div>
                )}
              </div>
            )}

            {/* Step Navigation Actions */}
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-[rgba(139,92,246,0.18)]">
              <button
                type="button"
                onClick={() => { if (currentStep > 0) showStep(currentStep - 1); }}
                disabled={currentStep === 0 || deployed || deployProgress > 0}
                className="px-5 py-2.5 rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(6,9,26,0.5)] text-sm font-semibold text-[#94a3b8] hover:text-[#f0f4ff] hover:border-[rgba(139,92,246,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <span className="text-xs text-[#64748b] font-mono hidden sm:block">
                Step {currentStep + 1} of {STEPS.length}
              </span>

              <button
                type="button"
                onClick={handleNext}
                disabled={deployed || deployProgress > 0}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-[0_0_24px_-4px_rgba(124,58,237,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 active:scale-95"
              >
                <span>{currentStep === STEPS.length - 1 ? (deployed ? 'Deployed' : 'Deploy Server') : 'Continue'}</span>
                {currentStep === STEPS.length - 1 ? <Rocket className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4 rotate-180" />}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
