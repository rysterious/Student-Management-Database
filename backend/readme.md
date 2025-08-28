#Database Schema Setup#

-- Create the students table
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    father_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone2 TEXT,
    emergency_contact TEXT,
    dob DATE NOT NULL,
    address TEXT,
    course TEXT NOT NULL,
    profile_pic_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);

-- Enable Row Level Security (optional)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your needs)
CREATE POLICY "Allow all operations" ON students
FOR ALL USING (true);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();






#Storage Bucket Setup#

-- Create the storage bucket for student photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the bucket

-- Policy for allowing public file uploads
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'student-photos');

-- Policy for allowing public file updates
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE TO public USING (bucket_id = 'student-photos');

-- Policy for allowing public file access
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'student-photos');

-- Policy for allowing public file deletion (optional - enable if needed)
-- CREATE POLICY "Allow public deletion" ON storage.objects
-- FOR DELETE TO public USING (bucket_id = 'student-photos');




