import { Button } from "flowbite-react";
import api from "../assets/api.png";

export default function CallToAction5() {
  return (
    <div className="flex  m-4 my-6 flex-col sm:flex-row p-3 border border-teal-500 justify-center items-center rounded-tl-3xl rounded-br-3xl text-center">
      <div className="flex-1 justify-center flex flex-col">
        <h2 className="text-2xl">Want to Master API in React js ?</h2>
        <p className="text-gray-500 my-2">
          Checkout this one single project to master API
        </p>
        <Button
          gradientDuoTone="purpleToPink"
          className="rounded-tl-xl rounded-bl-none"
        >
          <a
            href="https://youtube-clone-by-aakif.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Youtube CLone
          </a>
        </Button>
      </div>
      <div className="p-7 flex-1">
        <img src={api} />
      </div>
    </div>
  );
}
