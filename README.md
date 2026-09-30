# Cloud-Based Site Safety Monitoring Platform

A cloud-computing mini project: a real-time platform that monitors a construction site's safety
(temperature, hazardous gas, noise, vibration, helmet compliance) across zones, raises alerts,
and lets supervisors acknowledge alerts and log incidents.

**Tools covered:** Docker, Oracle VirtualBox, CloudSim, AWS Console.

## Architecture

```
 IoT sensors / simulator ──► Node.js + Express API ◄──► React dashboard (Vite)
   (POST /api/sensors/ingest)   │  Socket.IO (live push)      served by Nginx
                                └─ JSON storage (swap for DynamoDB/RDS)
 Docker Compose runs both containers  →  inside VirtualBox VM  →  or on AWS EC2
 CloudSim (cloudsim/) models how the cloud data-center scales the processing workload
```

## Folder structure

```
site-safety/
├── backend/      Express API, Socket.IO, sensor simulator, alert engine, Dockerfile
├── frontend/     React + Vite dashboard, Nginx config, Dockerfile
├── cloudsim/     Java + Maven CloudSim scaling simulation
├── docker-compose.yml
└── README.md
```

## 1. Run locally (no Docker)

Needs Node.js 18+.

```bash
# terminal 1
cd backend
npm install
npm start            # http://localhost:5000

# terminal 2
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Login (for acknowledging alerts / reporting incidents): `admin / admin123` or `supervisor / safe123`.
Viewing the dashboard needs no login.

## 2. Run with Docker

```bash
docker compose up --build
```
- Dashboard: http://localhost:8080
- API health: http://localhost:5000/api/health

Stop: `docker compose down` (data volume kept; add `-v` to wipe it).

## 3. Oracle VirtualBox deployment

1. Create a VM in VirtualBox: Ubuntu Server 22.04, 2 CPU, 2-4 GB RAM, 20 GB disk.
2. Network: **Adapter 1 = NAT** with Port Forwarding rules
   - Host 8080 → Guest 8080 (dashboard)
   - Host 5000 → Guest 5000 (API)
   - Host 2222 → Guest 22 (SSH)
   (or use Bridged Adapter and browse to the VM's IP)
3. Inside the VM install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER   # log out/in afterwards
   ```
4. Copy the project (`scp -P 2222 -r site-safety user@127.0.0.1:~/` or `git clone`), then
   `cd site-safety && docker compose up -d --build`.
5. Open `http://localhost:8080` on your host machine.

## 4. AWS Console deployment (EC2 + Docker)

1. **EC2 → Launch instance**: Ubuntu 22.04, `t2.micro`/`t3.micro` (free tier), create a key pair.
2. **Security group inbound rules**: SSH (22) from *My IP*, Custom TCP **8080** and **5000** from Anywhere (or restrict).
3. Connect: `ssh -i key.pem ubuntu@<EC2-PUBLIC-IP>`
4. Install Docker (same commands as above), upload the project (`scp` or `git clone`), then
   `docker compose up -d --build`.
5. Browse to `http://<EC2-PUBLIC-IP>:8080`.
6. Optional extras to show in the AWS Console:
   - **CloudWatch**: view instance CPU/network metrics and set an alarm.
   - **Elastic IP**: give the server a fixed public IP.
   - **S3**: store exported incident reports; **DynamoDB/RDS**: replace `backend/src/db.js` for managed storage.
   - **ECR + ECS/Fargate**: push the two images and run them as managed containers.
7. **Stop/terminate the instance when done** to avoid charges.

Before real deployment change `JWT_SECRET`, `INGEST_KEY`, `ADMIN_PASSWORD`, `SUPERVISOR_PASSWORD`
in `docker-compose.yml`.

## 5. CloudSim simulation

Needs JDK 11+ and Maven (or add the CloudSim 3.0.3 jar to an Eclipse/IntelliJ project).

```bash
cd cloudsim
mvn compile exec:java -Dexec.mainClass=sim.SafetyMonitoringSimulation
```
It simulates 20 sensor-processing tasks on a data-center with 2 hosts, first with 2 VMs then with 4 VMs,
and prints per-task times, average execution time and makespan, showing the benefit of scaling out in the cloud.
If Maven can't fetch the dependency, download `cloudsim-3.0.3.jar` from the CloudSim GitHub releases,
put it in `cloudsim/lib/`, and compile with `javac -cp "lib/*" -d out src/main/java/sim/*.java`.

## API summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | /api/health | - | health check |
| POST | /api/auth/login | - | get JWT |
| GET | /api/zones | - | latest reading per zone |
| GET | /api/readings/:zoneId | - | recent history |
| POST | /api/sensors/ingest | `x-api-key` | real device pushes a reading |
| GET | /api/alerts | - | alert list (`?active=true`) |
| PATCH | /api/alerts/:id/ack | JWT | acknowledge alert |
| GET/POST | /api/incidents | POST needs JWT | incident log |
| PATCH | /api/incidents/:id | JWT | update status |
| GET | /api/stats | - | dashboard summary |

Send a test reading:
```bash
curl -X POST http://localhost:5000/api/sensors/ingest \
  -H "Content-Type: application/json" -H "x-api-key: device-key-123" \
  -d '{"zoneId":"A","zoneName":"Zone A - Excavation","temperature":45,"gas":20,"noise":80,"vibration":2,"helmetCompliance":95,"workers":10}'
```

## Alert thresholds (`backend/src/thresholds.js`)
Temperature > 40 °C, gas > 50 ppm, noise > 95 dB, vibration > 7 mm/s, helmet compliance < 80 %.
Each breach lowers the zone's safety score by 20. Same alert type per zone is throttled to once per 30 s.

## Viva points
- **Why cloud?** Elastic scaling, remote access, central monitoring of many sites, pay-as-you-go.
- **Why Docker?** Same environment everywhere; one command to start; easy to deploy on VM or EC2.
- **Why VirtualBox?** Local test bed that mimics a cloud VM before deploying to AWS (IaaS).
- **Why CloudSim?** Evaluate data-center/VM scaling behaviour without paying for real infrastructure.
- **Real-time?** Socket.IO pushes each sensor reading and alert to the browser instantly.
- **Future work:** MongoDB/DynamoDB, camera-based PPE detection, SMS/email alerts (SNS), multi-site support.
