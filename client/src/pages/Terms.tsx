import PageLayout from "@/components/PageLayout";

const LAST_UPDATED = "May 28, 2026";

export default function Terms() {
  return (
    <PageLayout>
      {/* Page header */}
      <section className="bg-[oklch(20%_0.05_255)] py-16">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-white mb-3">
              Terms of Use
            </h1>
            <p className="text-white/50 text-sm">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-py bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <LegalSection title="1. Acceptance of Terms">
              <p>
                These Terms of Use ("Terms") govern your access to and use of the website located
                at legalintakeflow.com and all related services provided by Legal Intake Flow
                ("Company," "we," "us," or "our") (collectively, the "Services"). By accessing or
                using the Services, you agree to be bound by these Terms. If you do not agree to
                these Terms, you may not access or use the Services.
              </p>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of
                material changes by posting the updated Terms on this page and updating the "Last
                updated" date. Your continued use of the Services after any changes constitutes
                your acceptance of the revised Terms.
              </p>
            </LegalSection>

            <LegalSection title="2. Description of Services">
              <p>
                Legal Intake Flow operates a referral and partner access platform that connects
                disability benefits claimants with attorneys, advocates, and legal professionals
                (collectively, "Partners"). The Services include the website, partner access
                request functionality, lead delivery infrastructure, and related communications.
              </p>
              <p>
                Legal Intake Flow is not a law firm and does not provide legal advice, legal
                representation, or legal services of any kind. The Services are provided for
                informational and referral purposes only. Nothing on the Site or in the Services
                constitutes legal advice or creates an attorney-client relationship.
              </p>
            </LegalSection>

            <LegalSection title="3. Eligibility">
              <p>
                The Services are intended for use by licensed attorneys, certified non-attorney
                advocates, and legal professionals operating in the United States. By using the
                Services, you represent and warrant that you meet these eligibility requirements
                and have the legal authority to enter into these Terms.
              </p>
              <p>
                You must be at least 18 years of age to use the Services. By using the Services,
                you represent that you are at least 18 years old.
              </p>
            </LegalSection>

            <LegalSection title="4. Partner Access and Conduct">
              <SubSection title="4.1 Access Requests">
                <p>
                  Access to the partner network is subject to review and approval by Legal Intake
                  Flow. Submission of a Request Access form does not guarantee admission to the
                  partner network. We reserve the right to accept or decline any application at
                  our sole discretion.
                </p>
              </SubSection>
              <SubSection title="4.2 Partner Obligations">
                <p>
                  Partners agree to use leads and claimant information solely for the purpose of
                  evaluating and potentially representing claimants in disability benefits matters.
                  Partners may not sell, transfer, sublicense, or share claimant information with
                  third parties without the claimant's explicit consent.
                </p>
              </SubSection>
              <SubSection title="4.3 Prohibited Conduct">
                <p>You agree not to:</p>
                <ul>
                  <li>Use the Services for any unlawful purpose or in violation of applicable law</li>
                  <li>Misrepresent your qualifications, credentials, or practice area</li>
                  <li>Harass, intimidate, or engage in inappropriate contact with claimants</li>
                  <li>Attempt to circumvent the platform or establish direct relationships outside the intended process</li>
                  <li>Use automated tools to scrape, harvest, or collect data from the Services</li>
                  <li>Interfere with or disrupt the integrity or performance of the Services</li>
                </ul>
              </SubSection>
            </LegalSection>

            <LegalSection title="5. Claimant Consent and Data Use">
              <p>
                All claimant leads provided through the Services include documented consent for
                attorney contact. Partners acknowledge that claimant information is provided solely
                for the purpose of evaluating potential representation and must be handled in
                accordance with applicable professional responsibility rules, privacy laws, and
                these Terms.
              </p>
              <p>
                Partners are responsible for their own compliance with applicable laws governing
                the use of claimant information, including but not limited to attorney advertising
                rules, anti-spam laws, and applicable state privacy statutes.
              </p>
            </LegalSection>

            <LegalSection title="6. Intellectual Property">
              <p>
                The Site and its original content, features, and functionality are owned by Legal
                Intake Flow and are protected by United States and international copyright,
                trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p>
                You may not reproduce, distribute, modify, create derivative works of, publicly
                display, publicly perform, republish, download, store, or transmit any of the
                material on the Site without our prior written consent.
              </p>
            </LegalSection>

            <LegalSection title="7. Disclaimer of Warranties">
              <p>
                THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
                OR COURSE OF PERFORMANCE.
              </p>
              <p>
                Legal Intake Flow does not warrant that the Services will be uninterrupted, secure,
                or error-free; that defects will be corrected; or that the Services or the servers
                that make them available are free of viruses or other harmful components.
              </p>
            </LegalSection>

            <LegalSection title="8. Limitation of Liability">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL LEGAL INTAKE
                FLOW, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY
                DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER
                INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICES.
              </p>
              <p>
                IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR
                RELATING TO THESE TERMS OR THE SERVICES EXCEED THE GREATER OF ONE HUNDRED DOLLARS
                ($100) OR THE AMOUNTS PAID BY YOU TO LEGAL INTAKE FLOW IN THE TWELVE MONTHS
                PRECEDING THE CLAIM.
              </p>
            </LegalSection>

            <LegalSection title="9. Indemnification">
              <p>
                You agree to defend, indemnify, and hold harmless Legal Intake Flow and its
                affiliates, officers, directors, employees, and agents from and against any claims,
                liabilities, damages, judgments, awards, losses, costs, expenses, or fees
                (including reasonable attorneys' fees) arising out of or relating to your violation
                of these Terms or your use of the Services.
              </p>
            </LegalSection>

            <LegalSection title="10. Governing Law and Dispute Resolution">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the
                United States and the state in which Legal Intake Flow is incorporated, without
                regard to its conflict of law provisions.
              </p>
              <p>
                Any dispute arising out of or relating to these Terms or the Services shall be
                resolved through binding arbitration in accordance with the rules of the American
                Arbitration Association, except that either party may seek injunctive or other
                equitable relief in any court of competent jurisdiction.
              </p>
            </LegalSection>

            <LegalSection title="11. Termination">
              <p>
                We reserve the right to terminate or suspend your access to the Services at any
                time, with or without cause or notice, including for violation of these Terms. Upon
                termination, your right to use the Services will immediately cease.
              </p>
            </LegalSection>

            <LegalSection title="12. Severability">
              <p>
                If any provision of these Terms is held to be invalid, illegal, or unenforceable,
                the remaining provisions shall continue in full force and effect. The invalid or
                unenforceable provision shall be modified to the minimum extent necessary to make
                it valid and enforceable.
              </p>
            </LegalSection>

            <LegalSection title="13. Contact Us">
              <p>
                If you have questions about these Terms of Use, please contact us at:
              </p>
              <p>
                <strong>Legal Intake Flow</strong><br />
                Email:{" "}
                <a href="mailto:legal@legalintakeflow.com" className="text-[oklch(50%_0.16_255)] hover:underline">
                  legal@legalintakeflow.com
                </a>
              </p>
            </LegalSection>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="font-serif text-xl font-semibold text-[oklch(20%_0.05_255)] mb-4 pb-2 border-b border-[oklch(92%_0.01_255)]">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-sm text-[oklch(38%_0.015_255)] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-sans text-sm font-semibold text-[oklch(28%_0.012_255)] mb-2">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
