import { Button } from "@wps/input"
import { Ruler, Compass, Mountain, MapPin, Hammer, DropletOff, Phone, Mail } from "lucide-react"
import White_Point_Logo_Name from "../assets/white_point_logo_name_1625_500.webp";
import { CountyServiceMap } from "../components/ui/Map";
import { coreCountyNames, secondaryCountyNames } from "../data/serviceCounties";


export function Home() {

  return (
    <div>
      <div className="text-center bg-primary py-16">
        <div>
          <h1 className="text-4xl font-bold text-white sm:text-5xl mb-6">Welcome to</h1>
          <img src={White_Point_Logo_Name} alt="White Point Logo" className="mx-auto h-24 md:h-40 w-auto px-3 mx-2 bg-white/85 backdrop-blur rounded-md overflow-extend" />
          <p className="mt-6 text-lg leading-8 text-white mx-4">Your <strong>trusted</strong> partner for comprehensive survey solutions.</p>
          <p className="mt-2 text-lg leading-8 text-white mx-4">Proudly servicing <strong>Central Florida.</strong></p>
        </div>
        <div className="flex flex-col items-center justify-center mt-8 md:flex-row md:gap-6">
          <a href="tel:14077101980" className="flex items-center justify-center gap-2 text-white text-lg hover:text-gray-200 transition">
            <Phone className="w-5 h-5" strokeWidth={2} />
            (407) 710-1980
          </a>
          <p className="hidden md:block text-white text-lg">|</p>
          <a href="mailto:info@whitepointsurvey.com" className="flex items-center justify-center gap-2 text-white text-lg hover:text-gray-200 transition mt-4 md:mt-0">
            <Mail className="w-5 h-5" strokeWidth={2} />
            info@whitepointsurvey.com
          </a>
        </div>
      </div>
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ServiceCard
            title="Have a Question? Need a Quote?"
            description="Whether you're a homeowner, contractor, or developer, we provide tailored survey solutions to meet your specific needs. Get in touch with us today to discuss your project and receive a personalized quote."
            link={{ label: "Contact Us", url: "/contact" }}
          />
          <ServiceCard
            title="First Responder, Teacher, and Military Discounts"
            description="We honor the dedication and service of first responders, teachers, and military personnel by offering special discounts on our survey services. Contact us to learn more about how you can benefit from these exclusive offers."
            link={{ label: "Learn More", url: "/services/discounts" }}
          />
        </div>
      </section>
      <ServiceList />
      <section id="service-area" className="py-6 border-t border-primary max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hidden md:block">
          <h2 className="text-4xl font-bold text-center text-primary mb-6">
            Our Service Area
          </h2>
          <CountyServiceMap />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <CountyServiceList countyList="core" countyValues={coreCountyNames} />
            <CountyServiceList countyList="secondary" countyValues={secondaryCountyNames} />
          </div>
          <div className="hidden md:flex flex-row p-4 mt-4 items-center">
            <p className="mr-4 grow-1"><strong>Want a PDF</strong> to take with you? Not a problem, use the button to download our <span className="underline">Statement of Qualifications</span> </p>
            <Button
              label="Download SOQ"
              style="primary"
              size="medium"
              onClick={() => window.open("/statement_of_qualifications_2026.pdf", "_blank")} />
          </div>
        </div>
        <div className="block md:hidden">
          <h2 className="text-4xl font-bold text-center text-primary mb-6">
            Our Service Area
          </h2>
          <div className="grid grid-cols-1 gap-4 mt-6">
            <CountyServiceList countyList="core" countyValues={coreCountyNames} />
            <CountyServiceList countyList="secondary" countyValues={secondaryCountyNames} />
          </div>
          <div className="block md:hidden grid grid-cols-1 gap-4 mt-6 p-2 items-center">
            <p className="text-center"><strong>Want a PDF</strong> to take with you? Not a problem, use the button to download our <span className="underline">Statement of Qualifications</span></p>
            <Button
              label="Download SOQ"
              style="primary"
              size="medium"
              onClick={() => window.open("/statement_of_qualifications_2026.pdf", "_blank")} />
          </div>
        </div>
      </section>
    </div>
  )
}



function ServiceCard({ title, description, link }: { title: string; description: string, link: { label: string, url: string } }) {
  return (
    <div className="bg-white border-2 border-primary rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
      <p className="text-gray-600 mb-4 text-center">{description}</p>
      <div className="flex justify-center">
        <Button
          label={link.label}
          style="primary"
          size="medium"
          onClick={() => window.location.href = link.url} />
      </div>
    </div>
  )
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
    <section id="services" className="py-6 border-t border-primary max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="container">
        <h2 className="text-4xl font-bold text-center text-primary mb-6">
          Our Surveying Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {services.map((service) => (
            <div key={service.name} className="bg-white p-2 md:p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition">
              <service.icon className="w-16 h-16 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">{service.name}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row justify-between mt-4 bg-white p-2 md:p-6 items-center">
          <p className="flex-1 text-center items-center mb-2  md:text-left md:text-lg md:mb-0">For a full comprehensive list of our services, please see our services page.</p>
          <Button
            label="View Services"
            style="primary"
            size="medium"
            onClick={() => window.location.href = "/services"} />
        </div>
      </div>
    </section>
  )
}

function CountyServiceList({ countyList, countyValues }: { countyList: 'core' | 'secondary', countyValues: string[] }) {
  return (
    <div className={`border-l-4 ${countyList === 'core' ? 'border-primary' : 'border-primary-400'} bg-gray-50 pl-4 py-2`}>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{countyList === 'core' ? 'Core Counties' : 'Secondary Counties'}</h3>
      {
        countyList === 'core' ? (
          <p className="text-sm mb-2">Our primary service area with the most comprehensive coverage and fastest response times.</p>
        ) : (
          <p className="text-sm mb-2">Additional counties we serve with slightly longer response times.</p>
        )
      }
      {countyValues.length === 0 ? (
        <p className="text-sm text-gray-500">No {countyList} counties defined.</p>
      ) : (
        <p className="text-sm text-gray-500">{countyValues.join(", ")}</p>
      )}
    </div>
  )
}