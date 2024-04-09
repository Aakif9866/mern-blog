import { Button } from "flowbite-react";
import dom from "../assets/dom.png";

export default function CallToAction2() {
  return (
    <div className="flex flex-col sm:flex-row p-3 border border-teal-500 justify-center items-center rounded-tl-3xl rounded-br-3xl text-center m-4 my-6">
      <div className="flex-1 justify-center flex flex-col">
        <h2 className="text-2xl">Want to Master DOM in js ?</h2>
        <p className="text-gray-500 my-2">
          Checkout this one single project to master DOM
        </p>
        <Button
          gradientDuoTone="purpleToPink"
          className="rounded-tl-xl rounded-bl-none"
        >
          <a
            href="https://aakif-s-nike.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ecommerce shoe store
          </a>
        </Button>
      </div>
      <div className="p-7 flex-1">
        <img src={dom} />
      </div>
    </div>
  );
}
