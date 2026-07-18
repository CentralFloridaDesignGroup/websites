import { Ruler, Compass, Mountain, MapPin, Hammer, DropletOff, Phone, Mail } from "lucide-react";
import White_Point_Logo_Name from "../assets/white_point_logo_name_1625_500.webp";
import { CountyServiceMap } from "../components/ui/Map";
import { coreCountyNames, secondaryCountyNames } from "../data/serviceCounties";
import { MarketingButton, MarketingCardLink, MarketingServiceCard } from "../components/marketing";

export function Home() {
  return (
    <div>
      <div className="bg-primary py-16 text-center">
        <div>
          <h1 className="mb-6 text-4xl font-bold text-white sm:text-5xl">Welcome to</h1>
          <img src={White_Point_Logo_Name} alt="White Point Logo" className="mx-auto h-24 w-auto rounded-md bg-white/85 px-3 backdrop-blur md:h-40" />
          <p className="mx-4 mt-6 text-lg leading-8 text-white">Your <strong>trusted</strong> partner for comprehensive survey solutions.</p>
          <p className="mx-4 mt-2 text-lg leading-8 text-white">Proudly servicing <strong>Central Florida.</strong></p>
        </div>
        <div className="mt-8 flex flex-col items-center justify-center md:flex-row md:gap-6">
          <a href="tel:14077101980" className="flex items-center justify-center gap-2 text-lg text-white transition hover:text-gray-200">
            <Phone className="h-5 w-5" strokeWidth={2} />
            (407) 710-1980
          </a>
          <p className="hidden text-lg text-white md:block">|</p>
          <a href="mailto:info@whitepointsurvey.com" className="mt-4 flex items-center justify-center gap-2 text-lg text-white transition hover:text-gray-200 md:mt-0">
            <Mail className="h-5 w-5" strokeWidth={2} />
            info@whitepointsurvey.com
          </a>
        </div>
      </div>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <MarketingCardLink
            title="Have a Question? Need a Quote?"
            description="Whether you're a homeowner, contractor, or developer, we provide tailored survey solutions to meet your specific needs. Get in touch with us today to discuss your project and receive a personalized quote."
            href="/contact"
            actionLabel="Contact Us"
          />
          <MarketingCardLink
            title="First Responder, Teacher, and Military Discounts"
            description="We honor the dedication and service of first responders, teachers, and military personnel by offering special discounts on our survey services. Contact us to learn more about how you can benefit from these exclusive offers."
            href="/services/discounts"
            actionLabel="Learn More"
          />
        </div>
      </section>
      <ServiceList />
      <section id="service-area" className="mx-auto max-w-7xl border-t border-primary px-4 py-6 sm:px-6 lg:px-8">
        <div className="hidden md:block">
          <h2 className="mb-6 text-center text-4xl font-bold text-primary">
            Our Service Area
          </h2>
          <CountyServiceMap />
          <div className="mt-6 grid grid-cols-2 gap-4">
            <CountyServiceList countyList="core" countyValues={coreCountyNames} />
            <CountyServiceList countyList="secondary" countyValues={secondaryCountyNames} />
          </div>
          <div className="mt-4 hidden flex-row items-center p-4 md:flex">
            <p className="mr-4 grow"><strong>Want a PDF</strong> to take with you? Not a problem, use the button to download our <span className="underline">Statement of Qualifications</span></p>
            <MarketingButton
              label="Download SOQ"
              variant="primary"
              onClick={() => window.open("/statement_of_qualifications_2026.pdf", "_blank")}
            />
          </div>
        </div>
        <div className="block md:hidden">
          <h2 className="mb-6 text-center text-4xl font-bold text-primary">
            Our Service Area
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4">
            <CountyServiceList countyList="core" countyValues={coreCountyNames} />
            <CountyServiceList countyList="secondary" countyValues={secondaryCountyNames} />
          </div>
          <div className="mt-6 grid grid-cols-1 items-center gap-4 p-2 md:hidden">
            <p className="text-center"><strong>Want a PDF</strong> to take with you? Not a problem, use the button to download our <span className="underline">Statement of Qualifications</span></p>
            <MarketingButton
              label="Download SOQ"
              variant="primary"
              onClick={() => window.open("/statement_of_qualifications_2026.pdf", "_blank")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ServiceList() {
  const services = [
    { name: "Boundary Surveys", description: "Accurate property line determinations and horizontal measurements for residential and commercial properties.", icon: Ruler },
    { name: "Topographic Surveys", description: "Detailed site mapping including elevation data, contours, and natural features to support planning and design.", icon: Mountain },
    { name: "ALTA/NSPS Surveys", description: "Comprehensive surveys meeting national standards for title insurance and real estate transactions.", icon: Compass },
    { name: "Construction Staking", description: "Precise construction staking to ensure your project is built according to plan.", icon: Hammer },
    { name: "Subdivision Surveys", description: "Professional subdivision surveys for land development and property division.", icon: MapPin },
    { name: "FEMA Surveys", description: "Accurate elevation certificates and LOMR-F surveys for flood insurance and regulatory compliance.", icon: DropletOff },
  ];

  return (
    <section id="services" className="mx-auto max-w-7xl border-t border-primary px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h2 className="mb-6 text-center text-4xl font-bold text-primary">
          Our Surveying Services
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {services.map((service) => (
            <MarketingServiceCard key={service.name} title={service.name} description={service.description} icon={service.icon} />
          ))}
        </div>
        <div className="mt-4 flex flex-col items-center justify-between bg-white p-2 md:flex-row md:p-6">
          <p className="mb-2 flex-1 text-center md:mb-0 md:text-left md:text-lg">For a full comprehensive list of our services, please see our services page.</p>
          <MarketingButton
            label="View Services"
            variant="primary"
            onClick={() => window.location.href = "/services"}
          />
        </div>
      </div>
    </section>
  );
}

function CountyServiceList({ countyList, countyValues }: { countyList: 'core' | 'secondary', countyValues: string[] }) {
  return (
    <div className={`border-l-4 ${countyList === 'core' ? 'border-primary' : 'border-primary-400'} bg-gray-50 py-2 pl-4`}>
      <h3 className="mb-2 text-xl font-semibold text-gray-800">{countyList === 'core' ? 'Core Counties' : 'Secondary Counties'}</h3>
      {countyList === 'core' ? (
        <p className="mb-2 text-sm">Our primary service area with the most comprehensive coverage and fastest response times.</p>
      ) : (
        <p className="mb-2 text-sm">Additional counties we serve with slightly longer response times.</p>
      )}
      {countyValues.length === 0 ? (
        <p className="text-sm text-gray-500">No {countyList} counties defined.</p>
      ) : (
        <p className="text-sm text-gray-500">{countyValues.join(", ")}</p>
      )}
    </div>
  );
}
