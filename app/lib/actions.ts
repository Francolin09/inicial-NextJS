
'use server'; 
import {z} from 'zod'; 
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({ 
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Por favor selecciona un cliente' 
    }),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid'],{invalid_type_error:'Por favor selecciona un estado de invoice'}),
    date: z.string(),
});

export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
};

const CreateInvoice = FormSchema.omit({ id: true, date: true });  

const UpdateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(prevState:State ,formData: FormData){ 
   
    
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    
    if(!validatedFields.success){ 
        return {
            errors: validatedFields.error.flatten().fieldErrors, 
            message:'Faltan campos, Falló al crear el invoice'
        }
    }

    
    const {customerId,amount, status} = validatedFields.data; 
      
    
    const amountInCents = amount * 100;

    
    const date = new Date().toISOString().split('T')[0];

    

    try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInCents},${status},${date})`;
    }
    catch(error){
        console.log(error)
        return {
            message:  'Database error: No se pudo crear el invoice, lo siento mucho :('
        }
    }


    revalidatePath('/dashboard/invoices');


    redirect('/dashboard/invoices');

    

}


export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    const amountInCents = amount * 100;
   
   try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
    }
    catch(error){
        console.log(error)
       return {message: 'Database error: Error al actualizar invoice'}
    }
   
    
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
} 



export async function deleteInvoice(id: string) {
   //throw new Error ('cagamossss')
    try{
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices'); 
    }
    catch(error){
        console.log(error)
        return {message:'Database Error: Error eliminando invoice'}
    }
}



export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }

