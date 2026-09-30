package sim;

import java.text.DecimalFormat;
import java.util.*;
import org.cloudbus.cloudsim.*;
import org.cloudbus.cloudsim.core.CloudSim;
import org.cloudbus.cloudsim.provisioners.*;

/**
 * CloudSim model of the Site Safety Monitoring Platform back-end.
 * Each Cloudlet = processing of a batch of sensor readings / video frames from one site zone.
 * Compares how the cloud data-center handles the workload with 2 VMs vs 4 VMs (scaling).
 */
public class SafetyMonitoringSimulation {

    public static void main(String[] args) {
        run(2, 20);
        run(4, 20);
    }

    static void run(int vmCount, int taskCount) {
        System.out.println("\n===== Scenario: " + vmCount + " VMs, " + taskCount + " sensor-processing tasks =====");
        try {
            CloudSim.init(1, Calendar.getInstance(), false);
            Datacenter dc = createDatacenter("SiteSafety-Cloud-DC");
            DatacenterBroker broker = new DatacenterBroker("SafetyBroker");
            int brokerId = broker.getId();

            List<Vm> vms = new ArrayList<>();
            for (int i = 0; i < vmCount; i++) {
                // id, user, mips, pes, ram(MB), bw, size(MB), vmm, scheduler
                vms.add(new Vm(i, brokerId, 1000, 1, 1024, 1000, 10000, "Xen", new CloudletSchedulerTimeShared()));
            }
            broker.submitVmList(vms);

            List<Cloudlet> tasks = new ArrayList<>();
            UtilizationModel full = new UtilizationModelFull();
            Random rnd = new Random(42);
            for (int i = 0; i < taskCount; i++) {
                long length = 20000 + rnd.nextInt(30000); // MI: varying workload per zone
                Cloudlet c = new Cloudlet(i, length, 1, 300, 300, full, full, full);
                c.setUserId(brokerId);
                tasks.add(c);
            }
            broker.submitCloudletList(tasks);

            CloudSim.startSimulation();
            List<Cloudlet> done = broker.getCloudletReceivedList();
            CloudSim.stopSimulation();
            print(done);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Simulation failed: " + e.getMessage());
        }
    }

    static Datacenter createDatacenter(String name) throws Exception {
        List<Host> hosts = new ArrayList<>();
        for (int h = 0; h < 2; h++) {
            List<Pe> pes = new ArrayList<>();
            for (int p = 0; p < 4; p++) pes.add(new Pe(p, new PeProvisionerSimple(1000)));
            hosts.add(new Host(h, new RamProvisionerSimple(8192), new BwProvisionerSimple(10000),
                    1000000, pes, new VmSchedulerTimeShared(pes)));
        }
        DatacenterCharacteristics ch = new DatacenterCharacteristics(
                "x86", "Linux", "Xen", hosts, 5.5, 3.0, 0.05, 0.001, 0.0);
        return new Datacenter(name, ch, new VmAllocationPolicySimple(hosts), new LinkedList<Storage>(), 0);
    }

    static void print(List<Cloudlet> list) {
        DecimalFormat df = new DecimalFormat("###.##");
        System.out.println("Task | Status  | DC | VM | Time(s) | Start | Finish");
        double total = 0, maxFinish = 0;
        for (Cloudlet c : list) {
            String st = c.getStatus() == Cloudlet.SUCCESS ? "SUCCESS" : "FAILED ";
            System.out.println(String.format("%4d | %s |  %d |  %d | %7s | %5s | %6s",
                    c.getCloudletId(), st, c.getResourceId(), c.getVmId(),
                    df.format(c.getActualCPUTime()), df.format(c.getExecStartTime()), df.format(c.getFinishTime())));
            total += c.getActualCPUTime();
            maxFinish = Math.max(maxFinish, c.getFinishTime());
        }
        System.out.println("Average execution time: " + df.format(total / list.size()) + " s");
        System.out.println("Makespan (total completion time): " + df.format(maxFinish) + " s");
    }
}
