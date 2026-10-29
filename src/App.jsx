import { useState } from 'react';
import RobotScene from './RobotScene';
const App = () => {
   const [report, setReport] = useState(
      "Bugungi moliyaviy ko'rsatkichlarimiz o'tgan chorakka nisbatan 15 foizga o'sdi. Barcha tizimlar barqaror ishlamoqda.",
   );
   return (
      <main className='app'>
         <RobotScene reportText={report} width='100%' height='100%' />
         <section className='ui-container' aria-label='Hisobot boshqaruvi'>
            <div className='input-group'>
               <textarea
                  aria-label='Hisobot matni'
                  placeholder='Hisobot matnini kiriting...'
                  value={report}
                  onChange={event => setReport(event.target.value)}
               />
            </div>
         </section>
      </main>
   );
};
export default App;
