import { useEffect } from "react";

export default function Verify(){

useEffect(()=>{

const token =
new URLSearchParams(window.location.search)
.get("token");


fetch(
`/api/auth/verify?token=${token}`
)
.then(res=>res.text())
.then(data=>{
 console.log(data);
});


},[]);


return (
<h2>
กำลังยืนยัน Email...
</h2>
)

}