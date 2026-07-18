import { Mail, Phone } from 'lucide-react';
import { showNotification } from '@wps/layout';
import { type FormSubmission, type Package } from '@wps/scripts';
import { useState } from 'react';
import { MarketingButton, MarketingSelect, MarketingTextarea, MarketingTextField } from '../components/marketing';

export function Contact() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-center text-4xl font-bold text-primary">Give Us A Shout!</h1>
      <p className="mt-4 text-center text-lg text-gray-600">We'd love to hear from you. Whether you have questions, feedback, or just want to say hi, feel free to reach out!</p>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="mt-2 flex flex-col items-center justify-center border-2 border-primary bg-white p-6">
          <h2 className="mb-4 text-2xl font-semibold text-gray-800">Contact Information</h2>
          <div className="flex flex-col items-center gap-4 text-gray-600 md:flex-row">
            <a className="mb-2 flex items-center gap-2 text-gray-600 md:mb-0" href="tel:+14077101980">
              <Phone className="h-5 w-5 text-primary" />
              <span>+1.407.710.1980</span>
            </a>
            <div className="hidden md:block">|</div>
            <a className="mb-2 flex items-center gap-2 text-gray-600 md:mb-0" href="mailto:info@whitepointsurvey.com">
              <Mail className="h-5 w-5 text-primary" />
              <span>info@whitepointsurvey.com</span>
            </a>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}

type PreferredMethod = 'Email' | 'Phone' | 'Text message';
type FieldErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'subject' | 'message', string>>;

function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [preferredMethod, setPreferredMethod] = useState<PreferredMethod>('Email');
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const getApiKeyTarget = (): 'local' | 'prod' => {
    const configuredTarget = String(import.meta.env.VITE_API_KEY_TARGET ?? '').trim().toLowerCase();
    if (configuredTarget === 'local' || configuredTarget === 'prod') return configuredTarget;

    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    return hostname === 'localhost' || hostname === '127.0.0.1' ? 'local' : 'prod';
  };

  const resolveTransactionEmailApiKey = (): string => {
    const target = getApiKeyTarget();
    const localKey = String(import.meta.env.VITE_TRANSACTION_EMAIL_API_KEY_LOCAL ?? '').trim();
    const prodKey = String(import.meta.env.VITE_TRANSACTION_EMAIL_API_KEY_PROD ?? '').trim();
    const legacyKey = String(import.meta.env.VITE_TRANSACTION_EMAIL_API_KEY ?? '').trim();

    if (target === 'local') return localKey || legacyKey || prodKey;
    return prodKey || legacyKey || localKey;
  };

  const validateFields = (): boolean => {
    const nextErrors: FieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;

    if (!firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!emailRegex.test(email)) nextErrors.email = 'Please enter a valid email address.';
    if (!phone.trim()) nextErrors.phone = 'Phone number is required.';
    else if (!phoneRegex.test(phone)) nextErrors.phone = 'Please enter a valid phone number.';
    if (!subject.trim()) nextErrors.subject = 'Subject is required.';
    if (message.trim().length < 10) nextErrors.message = 'Message must be at least 10 characters long.';

    setFieldErrors(nextErrors);
    setSubmissionStatus(Object.keys(nextErrors).length ? 'error' : 'submitting');
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;
    setSubmissionStatus('submitting');

    const apiKey = resolveTransactionEmailApiKey();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.whitepointsurvey.com';

    if (!apiKey) {
      setSubmissionStatus('error');
      showNotification({
        title: "Configuration Error",
        body: "API key not configured. Please contact support.",
        style: 'danger',
      });
      return;
    }

    const submissionData: FormSubmission = {
      params: {
        FIRST_NAME: firstName,
        LAST_NAME: lastName,
        EMAIL: email,
        PHONE: phone,
        PREFERRED_METHOD: preferredMethod,
        MESSAGE: message
      },
      packages: [
        {
          toEmail: [email],
          replyToEmail: "info@whitepointsurvey.com",
          subject: `${firstName} ${lastName} - ${subject || "Contact Form Submission"}`,
          templateId: 2
        },
        {
          toEmail: ["info@whitepointsurvey.com"],
          replyToEmail: email,
          subject: `${firstName} ${lastName} - ${subject || "Contact Form Submission"}`,
          templateId: 1
        }
      ] as Package[]
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/email/transactionEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Company': 'WhitePointSurvey',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        setSubmissionStatus('success');
        showNotification({
          title: "Message Sent!",
          body: "Thank you for reaching out. We'll get back to you as soon as possible.",
          style: 'success',
        });
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
        setPreferredMethod('Email');
        setFieldErrors({});
        return;
      }

      const errorMessage = response.status === 401
        ? 'Authentication failed. Please try again later.'
        : 'Failed to send message. Please try again later.';
      showNotification({ title: "Error", body: errorMessage, style: 'danger' });
      setSubmissionStatus('error');
    } catch {
      showNotification({ title: "Error", body: "An unknown error occurred. Please try again later.", style: 'danger' });
      setSubmissionStatus('error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 className="text-center text-2xl font-bold text-primary">Send Us A Message</h2>
      <p className="mt-4 text-center text-gray-600">Have a question or want to work together? Fill out the form below and we'll get back to you as soon as possible.</p>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <MarketingTextField
          field="firstName"
          label="First Name"
          placeholder="John"
          value={firstName}
          autoComplete="given-name"
          error={fieldErrors.firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <MarketingTextField
          field="lastName"
          label="Last Name"
          placeholder="Doe"
          value={lastName}
          autoComplete="family-name"
          error={fieldErrors.lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
        <MarketingTextField
          className="md:col-span-2"
          field="email"
          label="Email Address"
          placeholder="john.doe@example.com"
          type="email"
          value={email}
          autoComplete="email"
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <MarketingTextField
          field="phone"
          label="Phone Number"
          placeholder="123-456-7890"
          type="tel"
          value={phone}
          autoComplete="tel"
          error={fieldErrors.phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <MarketingSelect
          field="preferredMethod"
          label="Preferred Contact Method"
          value={preferredMethod}
          options={[{ label: 'Email', value: 'Email' }, { label: 'Phone', value: 'Phone' }, { label: 'Text message', value: 'Text message' }]}
          onChange={(event) => setPreferredMethod(event.target.value as PreferredMethod)}
        />
        <MarketingTextField
          className="md:col-span-2"
          field="subject"
          label="Subject"
          placeholder="Subject of your message"
          value={subject}
          error={fieldErrors.subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <MarketingTextarea
          className="md:col-span-2"
          field="message"
          label="Message"
          placeholder="Type your message here..."
          value={message}
          error={fieldErrors.message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="flex flex-col justify-center md:col-span-2">
          <MarketingButton
            label={submissionStatus === 'submitting' ? 'Submitting Form...' : 'Submit Form'}
            variant={submissionStatus === 'submitting' ? 'secondary' : 'primary'}
            onClick={handleSubmit}
            disabled={submissionStatus === 'submitting'}
          />
        </div>
      </div>
    </div>
  );
}
