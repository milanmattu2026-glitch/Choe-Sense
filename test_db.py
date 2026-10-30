from supabase import create_client

env_vars = {}
with open('.env', 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip().replace('\ufeff', '')] = v.strip(' "\'')

client = create_client(env_vars['SUPABASE_URL'], env_vars['SUPABASE_SERVICE_ROLE_KEY'])

print("\n=== 1. SEEDED TRI-CITY CHOKEPOINTS (WITH AUTO LAT/LON & WEIGHTS) ===")
pts = client.table('chokepoints').select('name, lat, lon, current_risk, historical_recurrence_weight').execute().data
for p in pts:
    print(f" - {p['name']} ({p['lat']}, {p['lon']}) | Risk: {p['current_risk']} | Weight: {p['historical_recurrence_weight']}")

print("\n=== 2. POSTGIS KNN + POLYGON AUTO-ROUTER RPC TEST ===")
rpc_res = client.rpc('route_ticket_by_gps', {'lat': 30.6975, 'lon': 76.7086}).execute().data
print(f" Matched Authority : {rpc_res['jurisdiction_name']} ({rpc_res['jurisdiction_code']})")
print(f" Nearest Chokepoint: {rpc_res['nearest_chokepoint_name']} ({rpc_res['distance_meters']}m away)")
print(f" Reroute Advisory  : {rpc_res['reroute_advisory']}")

print("\n=== 3. CHART.JS SLA ACCOUNTABILITY METRICS VIEW ===")
metrics = client.table('v_sla_dashboard_metrics').select('authority_code, total_tickets, avg_resolution_hours, historical_petition_ratio').execute().data
for m in metrics:
    print(f" - {m['authority_code']}: {m['total_tickets']} tickets | Avg Resolve: {m['avg_resolution_hours']}h | Gap: {m['historical_petition_ratio']}:1")
