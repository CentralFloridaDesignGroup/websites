import { Button, Combobox, Textarea, Textbox } from '@wps/input';
import { Mail, Phone } from 'lucide-react';

import { showNotification } from '@wps/layout';
import { type FormSubmission, type Package } from '@wps/scripts';
import { useState } from 'react';

export function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-primary text-center">Give Us A Shout!</h1>
      <p className="mt-4 text-lg text-gray-600 text-center">We'd love to hear from you. Whether you have questions, feedback, or just want to say hi, feel free to reach out!</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col bg-white p-6 border-primary border-2 mt-2 justify-center items-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Information</h2>
          <div className="flex flex-col md:flex-row items-center gap-4 text-gray-600">
            <a className="flex items-center gap-2 text-gray-600 mb-2 md:mb-0" href="tel:+14077101980">
              <Phone className="text-primary w-5 h-5" />
              <span>+1.407.710.1980</span>
            </a>
            <div className='hidden md:block'>|</div>
            <a className="flex items-center gap-2 text-gray-600 mb-2 md:mb-0" href="mailto:info@whitepointsurvey.com">
              <Mail className="text-primary w-5 h-5" />
              <span>info@whitepointsurvey.com</span>
            </a>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}


function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [preferredMethod, setPreferredMethod] = useState<'Email' | 'Phone' | 'Text message'>('Email');
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submissionError, setSubmissionError] = useState<string[] | null>(null);

  const getApiKeyTarget = (): 'local' | 'prod' => {
    const configuredTarget = String(import.meta.env.VITE_API_KEY_TARGET ?? '').trim().toLowerCase();
    if (configuredTarget === 'local' || configuredTarget === 'prod') {
      return configuredTarget;
    }

    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    return hostname === 'localhost' || hostname === '127.0.0.1' ? 'local' : 'prod';
  };

  const resolveTransactionEmailApiKey = (): string => {
    const target = getApiKeyTarget();
    const localKey = String(import.meta.env.VITE_TRANSACTION_EMAIL_API_KEY_LOCAL ?? '').trim();
    const prodKey = String(import.meta.env.VITE_TRANSACTION_EMAIL_API_KEY_PROD ?? '').trim();
    const legacyKey = String(import.meta.env.VITE_TRANSACTION_EMAIL_API_KEY ?? '').trim();

    if (target === 'local') {
      return localKey || legacyKey || prodKey;
    }

    return prodKey || legacyKey || localKey;
  };

  const onValidReport = (field: string, isValid: boolean) => {
    if (isValid) {
      switch (field) {
        case 'firstName':
          setSubmissionError((prev) => prev ? prev.filter(error => error !== "First Name is required.") : null);
          break;
        case 'lastName':
          setSubmissionError((prev) => prev ? prev.filter(error => error !== "Last Name is required.") : null);
          break;
        case 'email':
          setSubmissionError((prev) => prev ? prev.filter(error => error !== "Email is required.") : null);
          break;
        case 'phone':
          setSubmissionError((prev) => prev ? prev.filter(error => error !== "Phone Number is required.") : null);
          break;
        case 'subject':
          setSubmissionError((prev) => prev ? prev.filter(error => error !== "Subject is required.") : null);
          break;
        case 'message':
          setSubmissionError((prev) => prev ? prev.filter(error => error !== "Message is required.") : null);
          break;
      }
    }
  }

  const validateFields = (): boolean => {
    if (submissionError !== null && submissionError.length > 0) {
      return false; // If there are already validation errors, do not proceed with submission
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmissionError((prev) => prev ? [...prev, "Please enter a valid email address."] : ["Please enter a valid email address."]);
    }

    // Basic phone number format validation (allows digits, spaces, dashes, parentheses, and optional leading +)
    const phoneRegex = /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
    if (!phoneRegex.test(phone)) {
      setSubmissionError((prev) => prev ? [...prev, "Please enter a valid phone number."] : ["Please enter a valid phone number."]);
    }

    setSubmissionStatus((submissionError === null || submissionError.length === 0) ? 'submitting' : 'error');
    return submissionError === null || submissionError.length === 0; // Return true if there are no errors, false otherwise
  }

  const handleSubmit = async () => {
    if (!validateFields()) {
      return;
    }
    setSubmissionStatus('submitting');
    setSubmissionError(null);

    // Get API key and base URL from environment
    const apiKey = resolveTransactionEmailApiKey();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.whitepointsurvey.com';

    if (!apiKey) {
      setSubmissionError(['Configuration error: API key not configured']);
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
      } else {
        const errorMessage = response.status === 401 
          ? 'Authentication failed. Please try again later.'
          : 'Failed to send message. Please try again later.';
        setSubmissionError([errorMessage]);
        showNotification({
          title: "Error",
          body: errorMessage,
          style: 'danger',
        });
        setSubmissionStatus('error');
      }
    } catch {
      setSubmissionError(['An unknown error occurred. Please try again later.']);
      showNotification({
        title: "Error",
        body: "An unknown error occurred. Please try again later.",
        style: 'danger',
      });
      setSubmissionStatus('error');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-primary text-center">Send Us A Message</h2>
      <p className="mt-4 text-gray-600 text-center">Have a question or want to work together? Fill out the form below and we'll get back to you as soon as possible.</p>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
        <Textbox
          field="firstName"
          label="First Name"
          placeholder="John"
          required={{ isRequired: true }}
          autocompleteField="given-name"
          onValidChange={(_, value) => setFirstName(value)}
          onValidReport={onValidReport}
        />
        <Textbox
          field="lastName"
          label="Last Name"
          placeholder="Doe"
          required={{ isRequired: true }}
          autocompleteField="family-name"
          onValidChange={(_, value) => setLastName(value)}
          onValidReport={onValidReport}
        />
        <div className="col-span-1 md:col-span-2">
          <Textbox
            field="email"
            label="Email Address"
            placeholder="john.doe@example.com"
            required={{ isRequired: true }}
            autocompleteField="email"
            type="email"
            regexFormat={{ format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMessage: "Invalid email format." }}
            onValidChange={(_, value) => setEmail(value)}
            onValidReport={onValidReport}
          />
        </div>
        <div>
          <Textbox
            field="phone"
            label="Phone Number"
            placeholder="123-456-7890"
            required={{ isRequired: true }}
            autocompleteField="tel"
            type="tel"
            regexFormat={{ format: /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/, errorMessage: "Invalid phone number format." }}
            onValidChange={(_, value) => setPhone(value)}
            onValidReport={onValidReport}
          />
        </div>
        <div>
          <Combobox
            field="preferredMethod"
            label="Preferred Contact Method"
            selections={[{ key: 'Email', value: 'Email' }, { key: 'Phone', value: 'Phone' }, { key: 'Text message', value: 'Text message' }]}
            required={true}
            defaultIndex={0}
            placeholder='Select method'
            onValidChange={(_, value) => setPreferredMethod(value as 'Email' | 'Phone' | 'Text message')}
            onValidReport={onValidReport}
          />
        </div>
        <div className='col-span-1 md:col-span-2'>
          <Textbox
            field="subject"
            label="Subject"
            placeholder="Subject of your message"
            required={{ isRequired: true }}
            type="text"
            onValidChange={(_, value) => setSubject(value)}
            onValidReport={onValidReport}
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <Textarea
            field="message"
            label="Message"
            placeholder="Type your message here..."
            required={{ isRequired: true }}
            regexFormat={{ format: /^.{10,}$/, errorMessage: "Message must be at least 10 characters long." }}
            allowNewlines={false}
            onValidChange={(_, value) => setMessage(value)}
            onValidReport={onValidReport}
          />
        </div>
        <div className="col-span-1 md:col-span-2 flex flex-col justify-center">
          <Button
            label={submissionStatus === 'submitting' ? 'Submitting Form...' : 'Submit Form'}
            style={submissionStatus === 'submitting' ? 'secondary' : 'primary'}
            size="medium"
            onClick={handleSubmit}
            properties={{
              disabled: submissionStatus === 'submitting',
            }}
          />
        </div>
      </div>
    </div>
  )
}