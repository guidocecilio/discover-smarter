package processing.index;

import com.hp.hpl.jena.rdf.model.InfModel;
import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;
import com.hp.hpl.jena.rdf.model.ResIterator;
import com.hp.hpl.jena.rdf.model.Resource;
import com.hp.hpl.jena.rdf.model.StmtIterator;
import com.hp.hpl.jena.util.FileManager;
import com.hp.hpl.jena.vocabulary.RDF;
import com.hp.hpl.jena.rdf.model.*;
import com.hp.hpl.jena.rdf.model.impl.ModelCom;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.io.*;

import play.Play;

import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.type.TypeReference;
import org.rdfhdt.hdt.hdt.HDT;
import org.rdfhdt.hdt.hdt.HDTManager;
import org.rdfhdt.hdtjena.HDTGraph;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;


import storage.SmartResource;
import static storage.SmartResource.*;


public class TypeIndex {
	private static String path ;
	private static String getPath(){
		if (path == null) path = Play.application().configuration().getString("files.path");
		return path;
	}
	
	//sets the path for tests
	public static void setPath(String datapath){
		path = datapath;
	}
	
	private static Logger logger = LoggerFactory.getLogger(TypeIndex.class);
	
	public static void build(String fileName) throws Exception{
		System.out.println("NEESH! trying to build classes");
		SmartResource hdtResource = SmartResource.apply(fileName);
		System.out.println("creating index for ["+fileName+ "]");
		SmartResource indexResource = SmartResource.apply(hdtResource.simpleName(), "jena");
		SmartResource minIndexResource = SmartResource.apply(hdtResource.simpleName(), "minjena");
		
		//loads schema
		System.out.println("about to load model");
		 Model schema = FileManager.get().loadModel("http://xmlns.com/foaf/spec/index.rdf");
	     schema.read("http://data.semanticweb.org/ns/swc/swc_2009-05-09.rdf");
	     //loads the data
	     Model data;
	     if (hdtResource.extension().equals("hdt")){
	    	 HDT hdt = HDTManager.loadIndexedHDT(hdtResource.innerUrl(), null);
	         HDTGraph graph = new HDTGraph(hdt);
	         data = new ModelCom(graph);
	     }else{
	    	 data = FileManager.get().loadModel("file:" + hdtResource.innerUrl());
	     }
	     InfModel infmodel = ModelFactory.createRDFSModel(schema, data);
	     //min index
         Map<String,String> minIndex = new HashMap();
         Map <String, String> simpleTypes = new HashMap<String,String>();
         Map<String, List<String>> index = new HashMap<String, List<String>>();
 	    
         simpleTypes.put("http://xmlns.com/foaf/0.1/Person", "Person");
         simpleTypes.put("http://xmlns.com/foaf/0.1/Organization", "Organization");
         simpleTypes.put("http://data.semanticweb.org/ns/swc/ontology#MeetingRoomPlace", "Location");
         simpleTypes.put("http://xmlns.com/foaf/0.1/Document", "Document");
        
         
	     ResIterator resourceTypes = infmodel.listSubjectsWithProperty(RDF.type);
	     while (resourceTypes.hasNext()) {
	            Resource resource = resourceTypes.nextResource();
	            StmtIterator types = resource.listProperties(RDF.type);
	            List<String> valOfTypes = new ArrayList<String>();
	            String type = null;
	            while (types.hasNext()) {
	                Statement s = types.nextStatement();
	                if(simpleTypes.get(s.getObject().toString())!=null)type=simpleTypes.get(s.getObject().toString());
	                valOfTypes.add(s.getObject().toString());
	            }
	            index.put(resource.toString(), valOfTypes);
	            if(type!=null)minIndex.put(resource.toString(), type);
	            BufferedWriter indexWriter = new BufferedWriter(new FileWriter(indexResource.innerUrl()));
	            
	            final ObjectMapper mapper = new ObjectMapper();
	            
	            mapper.writeValue(indexWriter, index);
	            indexWriter.close(); 
	            
	            BufferedWriter minIndexwriter = new BufferedWriter(new FileWriter(minIndexResource.innerUrl()));
	            mapper.writeValue(minIndexwriter, minIndex);
	            minIndexwriter.close(); 
	     }
	     
	}
	
	public static Map<String, List<String>> getIndex(String fileName) throws Exception{
		String file = getPath()+fileName;
		String indexFile = file+".json";
		ObjectMapper mapper = new ObjectMapper(); 
		Map<String, List<String>> result = new HashMap<String, List<String>>();
        TypeReference<HashMap<String, List<String>>> typeRef = new TypeReference<HashMap<String, List<String>>>() {};
        result= mapper.readValue(new File(indexFile),  typeRef);
        return result;
	}
	
	public static Map<String, String> getMinIndex(String fileName) throws Exception{
		String file = getPath()+fileName;
		String minIndexFile = file + ".min.json";
		ObjectMapper mapper = new ObjectMapper(); 
		Map<String, String> result = new HashMap<String, String>();
        TypeReference<HashMap<String, String>> typeRef = new TypeReference<HashMap<String, String>>() {};
        result= mapper.readValue(new File(minIndexFile),  typeRef);
        return result;
	}
	
	public static String getIndexAsJson(String fileName) throws Exception{
		final OutputStream out = new ByteArrayOutputStream();
        final ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(out, getIndex(fileName));
        final byte[] data = ((ByteArrayOutputStream) out).toByteArray();
        return (new String(data));
	}
	
	public static String getMinIndexAsJson(String fileName) throws Exception{
		final OutputStream out = new ByteArrayOutputStream();
        final ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(out, getMinIndex(fileName));
        final byte[] data = ((ByteArrayOutputStream) out).toByteArray();
        return (new String(data));
	}
	
}
