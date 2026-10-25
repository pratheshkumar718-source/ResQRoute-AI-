"""Local, offline road-network model used for SIMULATED routes.

A deterministic jittered street grid (with some blocked links and faster 'arterial'
roads) is generated around a fictional demo area. Routes are Dijkstra shortest-TIME
paths over that graph. They are NOT real roads: distances and ETAs are simulated
estimates. No external routing API is used.
"""
import heapq, math, random
from functools import lru_cache

N = 14
LAT0, LAT1 = 13.040, 13.130
LNG0, LNG1 = 80.200, 80.320
BBOX = {"min_lat": LAT0, "max_lat": LAT1, "min_lng": LNG0, "max_lng": LNG1}


def haversine(a, b):
    r = 6371.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _build():
    rnd = random.Random(7)
    nodes = []
    for i in range(N):
        for j in range(N):
            lat = LAT0 + (LAT1 - LAT0) * i / (N - 1)
            lng = LNG0 + (LNG1 - LNG0) * j / (N - 1)
            if 0 < i < N - 1 and 0 < j < N - 1:
                lat += rnd.uniform(-0.0012, 0.0012)
                lng += rnd.uniform(-0.0012, 0.0012)
            nodes.append((lat, lng))
    idx = lambda i, j: i * N + j
    edges = []
    for i in range(N):
        for j in range(N):
            if j + 1 < N:
                edges.append((idx(i, j), idx(i, j + 1), i % 4 == 0))
            if i + 1 < N:
                edges.append((idx(i, j), idx(i + 1, j), j % 4 == 0))
    adj = {k: set() for k in range(len(nodes))}
    for a, b, _ in edges:
        adj[a].add(b); adj[b].add(a)

    def connected(adjm):
        seen, st = {0}, [0]
        while st:
            u = st.pop()
            for v in adjm[u]:
                if v not in seen:
                    seen.add(v); st.append(v)
        return len(seen) == len(nodes)

    final = []
    for a, b, major in edges:
        if not major and rnd.random() < 0.12:  # blocked minor street
            adj[a].discard(b); adj[b].discard(a)
            if not connected(adj):
                adj[a].add(b); adj[b].add(a)
            else:
                continue
        final.append((a, b, major))
    graph = {k: [] for k in range(len(nodes))}
    for a, b, major in final:
        d = haversine(nodes[a], nodes[b])
        t = d / (50.0 if major else 30.0) * 60  # minutes
        graph[a].append((b, d, t)); graph[b].append((a, d, t))
    return nodes, final, graph


NODES, EDGES, GRAPH = _build()


def network():
    return {"bbox": BBOX, "nodes": [list(n) for n in NODES], "edges": [[a, b, 1 if m else 0] for a, b, m in EDGES],
            "label": "Simulated demo road network (fictional, generated locally)"}


def _nearest(p):
    return min(range(len(NODES)), key=lambda k: haversine(p, NODES[k]))


def _dijkstra(s, t):
    dist = {s: 0.0}; prev = {}; pq = [(0.0, s)]
    while pq:
        c, u = heapq.heappop(pq)
        if u == t:
            break
        if c > dist.get(u, 1e18):
            continue
        for v, d, tm in GRAPH[u]:
            nc = c + tm
            if nc < dist.get(v, 1e18):
                dist[v] = nc; prev[v] = u; heapq.heappush(pq, (nc, v))
    path = [t]
    while path[-1] != s:
        path.append(prev[path[-1]])
    return path[::-1]


@lru_cache(maxsize=4096)
def _route(a, b):
    sn, tn = _nearest(a), _nearest(b)
    path = _dijkstra(sn, tn) if sn != tn else [sn]
    coords = [a] + [NODES[k] for k in path] + [b]
    # drop zero-length duplicates
    cl = [coords[0]] + [c for p, c in zip(coords, coords[1:]) if haversine(p, c) > 1e-6]
    if len(cl) < 2:
        cl = [a, b]
    dist = tm = 0.0
    graph_edges = {(u, v): (d, t) for u in GRAPH for v, d, t in GRAPH[u]}
    for k in range(len(path) - 1):
        d, t = graph_edges[(path[k], path[k + 1])]
        dist += d; tm += t
    for conn in (haversine(a, NODES[sn]), haversine(b, NODES[tn])):
        dist += conn; tm += conn / 20.0 * 60
    return [list(c) for c in cl], dist, tm


def route(a, b):
    a = (round(a[0], 5), round(a[1], 5)); b = (round(b[0], 5), round(b[1], 5))
    coords, dist, tm = _route(a, b)
    return {"coords": coords, "distance_km": round(dist, 2), "eta_min": round(max(tm, 0.3), 1),
            "simulated": True, "label": "SIMULATED route on a generated demo road network — not real roads/traffic"}


def cumulative(coords):
    cum = [0.0]
    for p, c in zip(coords, coords[1:]):
        cum.append(cum[-1] + haversine(p, c))
    return cum


def point_at(coords, cum, frac):
    total = cum[-1]
    if total <= 0:
        return coords[-1]
    target = frac * total
    for k in range(1, len(cum)):
        if cum[k] >= target:
            seg = cum[k] - cum[k - 1]
            f = 0 if seg == 0 else (target - cum[k - 1]) / seg
            return [coords[k - 1][0] + (coords[k][0] - coords[k - 1][0]) * f,
                    coords[k - 1][1] + (coords[k][1] - coords[k - 1][1]) * f]
    return coords[-1]
