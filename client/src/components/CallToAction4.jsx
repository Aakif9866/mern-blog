import { Button } from "flowbite-react";
import tailwind from "../assets/tailwind.png";
export default function CallToAction4() {
  return (
    <div className="flex  m-4 my-6 flex-col sm:flex-row p-3 border border-teal-500 justify-center items-center rounded-tl-3xl rounded-br-3xl text-center">
      <div className="flex-1 justify-center flex flex-col">
        <h2 className="text-2xl">Want to Master tailwind css ?</h2>
        <p className="text-gray-500 my-2">
          Checkout this one single project to master tailwind css
        </p>
        <Button
          gradientDuoTone="purpleToPink"
          className="rounded-tl-xl rounded-bl-none"
        >
          <a
            href="https://splendid-nasturtium-dfe841.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            NIke store website
          </a>
        </Button>
      </div>
      <div className="p-7 flex-1">
        <img src={tailwind} />
      </div>
    </div>
  );
}
