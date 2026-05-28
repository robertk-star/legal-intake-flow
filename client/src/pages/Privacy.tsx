import PageLayout from "@/components/PageLayout";

const LAST_UPDATED = "May 28, 2026";

export default function Privacy() {
  return (
    <PageLayout>
      {/* Page header */}
      <section className="bg-[oklch(20%_0.05_255)] py-16">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl font-semibold text-white mb-3">
              Privacy Policy
            </h1>
            <p className="text-white/50 text-sm">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-py bg-white">
        <div className="container">
          <div className="max-w-3xl mx-auto prose-custom">
            <LegalSection title="1. Introduction">
              <p>
                Legal Intake Flow ("Company," "we," "us," or "our") operates the website located at
                legalintakeflow.com (the "Site") and the related services described herein
                (collectively, the "Services"). This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you visit our Site or use our Services.
              </p>
              <p>
                Please read this Privacy Policy carefully. By accessing or using the Services, you
                acknowledge that you have read, understood, and agree to be bound by the terms of
                this Privacy Policy. If you do not agree with the terms of this Privacy Policy,
                please do not access the Site or use the Services.
              </p>
            </LegalSection>

            <LegalSection title="2. Information We Collect">
              <p>We may collect the following categories of information:</p>
              <SubSection title="2.1 Information You Provide Directly">
                <p>
                  When you submit a Request Access form or otherwise contact us, we collect
                  information you provide, which may include your name, firm or organization name,
                  email address, phone number, state of practice, and any message or description
                  you choose to include.
                </p>
              </SubSection>
              <SubSection title="2.2 Automatically Collected Information">
                <p>
                  When you visit the Site, we may automatically collect certain information about
                  your device and browsing activity, including your IP address, browser type,
                  operating system, referring URLs, pages viewed, and the date and time of your
                  visit. This information is collected using cookies and similar tracking
                  technologies as described in Section 6 below.
                </p>
              </SubSection>
              <SubSection title="2.3 Information from Third Parties">
                <p>
                  We may receive information about you from third-party services and partners in
                  connection with the operation of our platform, subject to those parties' privacy
                  policies and applicable law.
                </p>
              </SubSection>
            </LegalSection>

            <LegalSection title="3. How We Use Your Information">
              <p>We use the information we collect for the following purposes:</p>
              <ul>
                <li>To respond to your inquiries and process your access requests</li>
                <li>To communicate with you about the Services, including onboarding and partner updates</li>
                <li>To operate, maintain, and improve the Site and Services</li>
                <li>To send administrative communications, such as confirmations and notifications</li>
                <li>To comply with legal obligations and enforce our agreements</li>
                <li>To detect, prevent, and address fraud, security issues, and technical problems</li>
                <li>For any other purpose with your consent</li>
              </ul>
            </LegalSection>

            <LegalSection title="4. Disclosure of Your Information">
              <p>We may share your information in the following circumstances:</p>
              <SubSection title="4.1 Service Providers">
                <p>
                  We may share your information with third-party vendors and service providers that
                  perform services on our behalf, such as hosting, analytics, email delivery, and
                  customer support. These parties are authorized to use your information only as
                  necessary to provide services to us.
                </p>
              </SubSection>
              <SubSection title="4.2 Legal Requirements">
                <p>
                  We may disclose your information if required to do so by law or in response to
                  valid requests by public authorities (e.g., a court or government agency).
                </p>
              </SubSection>
              <SubSection title="4.3 Business Transfers">
                <p>
                  If we are involved in a merger, acquisition, financing, reorganization, bankruptcy,
                  or sale of all or a portion of our assets, your information may be transferred as
                  part of that transaction.
                </p>
              </SubSection>
              <SubSection title="4.4 With Your Consent">
                <p>
                  We may share your information with third parties when you have given us your
                  consent to do so.
                </p>
              </SubSection>
            </LegalSection>

            <LegalSection title="5. Data Retention">
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes
                described in this Privacy Policy, unless a longer retention period is required or
                permitted by law. When we no longer need your information, we will securely delete
                or anonymize it.
              </p>
            </LegalSection>

            <LegalSection title="6. Cookies and Tracking Technologies">
              <p>
                We use cookies and similar tracking technologies to collect and use information about
                you and your interactions with the Site. Cookies are small data files stored on your
                device. You can instruct your browser to refuse all cookies or to indicate when a
                cookie is being sent. However, if you do not accept cookies, some portions of the
                Site may not function properly.
              </p>
              <p>
                We may use third-party analytics services, including but not limited to Google
                Analytics, to help us understand how visitors use the Site. These services may use
                cookies and similar technologies to collect information about your use of the Site.
              </p>
            </LegalSection>

            <LegalSection title="7. Data Security">
              <p>
                We implement reasonable administrative, technical, and physical security measures to
                protect your information from unauthorized access, use, alteration, and disclosure.
                However, no method of transmission over the Internet or method of electronic storage
                is completely secure, and we cannot guarantee absolute security.
              </p>
            </LegalSection>

            <LegalSection title="8. Your Rights and Choices">
              <p>
                Depending on your location, you may have certain rights regarding your personal
                information, including the right to access, correct, delete, or restrict processing
                of your data. To exercise any of these rights, please contact us using the
                information provided in Section 11 below.
              </p>
              <p>
                California residents may have additional rights under the California Consumer Privacy
                Act (CCPA). Please contact us for more information about your rights under applicable
                state law.
              </p>
            </LegalSection>

            <LegalSection title="9. Third-Party Links">
              <p>
                The Site may contain links to third-party websites and services. We are not
                responsible for the privacy practices or content of those third parties. We encourage
                you to review the privacy policies of any third-party sites you visit.
              </p>
            </LegalSection>

            <LegalSection title="10. Children's Privacy">
              <p>
                The Services are not directed to individuals under the age of 18. We do not
                knowingly collect personal information from children under 18. If we become aware
                that a child under 18 has provided us with personal information, we will take steps
                to delete such information.
              </p>
            </LegalSection>

            <LegalSection title="11. Changes to This Privacy Policy">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by posting the new Privacy Policy on this page and updating the
                "Last updated" date above. Your continued use of the Services after any changes
                constitutes your acceptance of the revised Privacy Policy.
              </p>
            </LegalSection>

            <LegalSection title="12. Contact Us">
              <p>
                If you have questions or concerns about this Privacy Policy or our privacy practices,
                please contact us at:
              </p>
              <p>
                <strong>Legal Intake Flow</strong><br />
                Email:{" "}
                <a href="mailto:privacy@legalintakeflow.com" className="text-[oklch(50%_0.16_255)] hover:underline">
                  privacy@legalintakeflow.com
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
