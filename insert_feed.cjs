const fs = require('fs');
const path = '/app/applet/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const feedConstants = `
const feedA = [
    ['https://w.wallhaven.cc/full/1q/wallhaven-1qgvrg.jpg','MC_01','MINECRAFT // OVERWORLD'],
    ['https://w.wallhaven.cc/full/w5/wallhaven-w5dwyx.png','MC_02','MINECRAFT // SURVIVAL'],
    ['https://w.wallhaven.cc/full/7j/wallhaven-7jeldy.png','MC_03','MINECRAFT // CREATIVE'],
    ['https://w.wallhaven.cc/full/gw/wallhaven-gwmwr3.png','MC_04','MINECRAFT // CAVES'],
];

const feedB = [
    ['https://w.wallhaven.cc/full/og/wallhaven-og6gz9.png','MC_05','MINECRAFT // LANDSCAPE'],
    ['https://w.wallhaven.cc/full/ly/wallhaven-lyjyll.png','MC_06','MINECRAFT // SHADERS'],
    ['https://w.wallhaven.cc/full/je/wallhaven-jeye2m.png','MC_07','MINECRAFT // EXPLORE'],
    ['https://w.wallhaven.cc/full/7j/wallhaven-7je6jo.png','MC_08','MINECRAFT // MULTIPLAYER'],
];

`;

content = content.replace('const tickerItems = [', feedConstants + 'const tickerItems = [');

const visualFeedSection = `
        {/* 03 VISUAL FEED */}
        <section id="feed" className="border-t border-zinc-500/20 py-20 bg-zinc-950/80 overflow-hidden">
            <div className="max-w-7xl mx-auto px-5 md:px-8 mb-10 reveal active">
                <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-zinc-100 bg-zinc-500/10 px-2.5 py-1 rounded-md border border-zinc-500/30 font-bold">03</span>
                    <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-red-200">
                        VISUAL FEED
                    </h2>
                </div>
                <p className="text-zinc-300/70 font-light mt-3 max-w-md">Physical layer — datacenter & server telemetry imagery streamed live from active availability zones.</p>
            </div>

            <div className="space-y-6">
                <div className="overflow-hidden">
                    <div className="marquee">
                        {[...feedA, ...feedA].map(([img, idx, cap], i) => (
                            <figure key={i} className="group relative flex-shrink-0 w-[78vw] md:w-[500px] aspect-[16/10] overflow-hidden rounded-2xl border border-zinc-500/20 bg-zinc-900 shadow-xl hover:border-zinc-100/60 transition-all duration-300">
                                <img src={img} alt={cap} loading="lazy"
                                     className="bw-img absolute inset-0 w-full h-full object-cover" />
                                <span className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-white bg-gradient-to-r from-red-700 to-zinc-600 px-2.5 py-1 rounded-md shadow-md z-10 font-bold">{idx}</span>
                                <figcaption className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                    <p className="font-mono text-[11px] tracking-widest text-zinc-300 font-bold">{cap}</p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
                <div className="overflow-hidden">
                    <div className="marquee rev">
                        {[...feedB, ...feedB].map(([img, idx, cap], i) => (
                            <figure key={i} className="group relative flex-shrink-0 w-[78vw] md:w-[500px] aspect-[16/10] overflow-hidden rounded-2xl border border-red-600/20 bg-zinc-900 shadow-xl hover:border-red-500/60 transition-all duration-300">
                                <img src={img} alt={cap} loading="lazy"
                                     className="bw-img absolute inset-0 w-full h-full object-cover" />
                                <span className="absolute top-3 left-3 font-mono text-[10px] tracking-widest text-white bg-gradient-to-r from-red-700 to-zinc-600 px-2.5 py-1 rounded-md shadow-md z-10 font-bold">{idx}</span>
                                <figcaption className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                    <p className="font-mono text-[11px] tracking-widest text-zinc-300 font-bold">{cap}</p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </div>
        </section>
        {/* FOOTER */}
`;

content = content.replace('{/* FOOTER */}', visualFeedSection);

fs.writeFileSync(path, content, 'utf8');
console.log('Visual feed added back');
