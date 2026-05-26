import { MainLayout } from "@/components/layout/MainLayout";
import { ProposalGenerator } from "@/components/proposals/ProposalGenerator";

export default function SmartProposalModule() {
  return (
    <MainLayout>
      <ProposalGenerator />
    </MainLayout>
  );
}
