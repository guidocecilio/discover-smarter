/*

Copyright Mario Arias 2013
Contact <mario.arias@deri.org>
Please do not redistribute this file.

*/

(function(global) {
	"use strict";

	function loadHDT(ByteBuffer, FileReader) {

		ByteBuffer.prototype.readUTF8StringNull = function(offset) {
			var advance = typeof offset === 'undefined';
			offset = typeof offset !== 'undefined' ? offset : this.offset;
			var dec, result = "", start = offset;
			while(offset<this.array.byteLength) {
				dec = ByteBuffer.decodeUTF8Char(this, offset);
				if(dec["char"]==0) {
					break;
				}
				offset += dec["length"];
				result += String.fromCharCode(dec["char"]);
			}

			if (advance) {
				this.offset = offset+1; // +1 for NULL;
				return result;
			} else {
				return {
					"string": result,
					"length": offset-start
				};
			}

		};

		ByteBuffer.prototype.skip = function(pos) {
			this.offset += pos;
		};

		ByteBuffer.prototype.readVByte = function(offset, ret) {
			var advance = typeof offset === 'undefined';
			offset = typeof offset !== 'undefined' ? offset : this.offset;

			var out = 0;
			var shift=0;
			var numread=0;

			if (offset+1 > this.array.byteLength) {
				throw(new Error("Cannot read VByte from "+this+" at "+offset+": Capacity overflow"));
			}
			var readbyte = this.view.getUint8(offset); numread++; offset++;

			while( (readbyte & 0x80)==0) {
				if(shift>=50) { // We read more bytes than required to load the max long
					throw(new Error("Read too many bytes from "+this+" to decode a VByte at "+offset+": Capacity overflow"));
				}

				out |= (readbyte & 127) << shift;

				if (offset+1 > this.array.byteLength) {
					throw(new Error("Cannot read VByte from "+this+" at "+offset+": Capacity overflow"));
				}
				readbyte = this.view.getUint8(offset); numread++; offset++;

				shift+=7;
			}
			out |= (readbyte & 127) << shift;

			if(advance) {
				this.offset = offset;
			}

			if(typeof ret === 'object') {
				ret.numbytes = numread;
				ret.value = out;
			}

			return out;
		};

		ByteBuffer.prototype.readPartialUint32 = function(offset) {
			var advance = typeof offset === 'undefined';
			offset = typeof offset !== 'undefined' ? offset : this.offset;

			if (offset+1 > this.array.byteLength) {
				throw(new Error("Cannot read partial Uint32 from "+this+" at "+offset+": Capacity overflow"));
			} else if (offset+4 > this.array.byteLength) {
            	// Special case, not 4 bytes are available, read as much as possible. Note: Little endian only!
            	var value = 0;
            	var shift = 0;
            	while(offset<this.array.byteLength) {
			value |= this.view.getUint8(offset) << shift;
            		shift+=8;
            		offset++;
            	}
            	if(advance) this.offset=this.array.byteLength;
				return value;
            } else {
            	if(advance) this.offset+=4;
            	return this.view.getUint32(offset, this.littleEndian);
            }
		};

		ByteBuffer.prototype.writePartialUint32 = function(offset, value) {
			var advance = typeof offset === 'undefined';
			offset = typeof offset !== 'undefined' ? offset : this.offset;

			if (offset+1 > this.array.byteLength) {
				throw(new Error("Cannot write partial Uint32 on "+this+" at "+offset+": Capacity overflow"));
			} else if (offset+4 > this.array.byteLength) {
				// Special case, not 4 bytes are available, write as much as possible. Note: Little endian only!
				var shift = 0;
				while(offset<this.array.byteLength) {
					this.view.setUint8( offset, value & 0xFF );
					value = value >>> 8;
					offset++;
				}
				if(advance)
					this.offset=this.array.byteLength;
				return value;
			} else {
				if(advance)
					this.offset+=4;
				return this.view.setUint32(offset, value & 0xFFFFFFFF, true);
			}
		};

		HDT.HDTv1 = "<http://purl.org/HDT/hdt#HDTv1>";

		HDT.ControlInfoType = {
				UNKNOWN : 0,
				GLOBAL : 1,
				HEADER : 2,
				DICTIONARY : 3,
				TRIPLES : 4,
				INDEX : 5
		};

		HDT.DictionarySectionRole = {
				SUBJECT : 0,
				PREDICATE : 1,
				OBJECT: 2,
				SHARED : 3
		};

		function ControlInfo(buffer) {
			var cookie = buffer.readUTF8StringBytes(4);

			// Cookie
			if(cookie!=="$HDT") {
				alert("Not an HDT file: "+cookie);
				return;
			}

			// Type
			this.type = buffer.readUint8();

			// Format
			this.format = buffer.readUTF8StringNull();

			// Properties
			var propertiesStr = buffer.readUTF8StringNull();
			var propArr = propertiesStr.split(";");
			var allProps={};
			propArr.forEach(function(item) {
				var pos = item.indexOf('=');
				if(pos!=-1) {
					var property = item.substring(0, pos);
					var value = item.substring(pos+1);
					//console.log("Property: "+property+ " Value: "+value);
					allProps[property] = value;
				};
			});
			this.properties = allProps;

			// CRC
			buffer.skip(2);

			// Debug
			//console.log(this.format);
			//console.log(this.properties);
		}


		/** Number of words for array */
		function numWordsFor(bitsField, total) {
			return ((bitsField*total+31)/32)|0;
		}

		/** Number of bits required for last word */
		function lastWordNumBits(bitsField, total) {
			var totalBits = bitsField*total;
			if(totalBits==0) {
				return 0;
			}
			return ((totalBits-1) % 32)+1;	// +1 To have output in the range 1-32, -1 to compensate.
		}

		function numBytesFor(bitsField, total) {
			return ((bitsField*total+7)/8)|0;
		}

		function bitCount32(i) {
			i = i - ((i >> 1) & 0x55555555);
			i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
			return (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
		}

		function select1(value, rank) {
			var bitpos=0;
			while(rank>0 && value!=0) {
				rank-= value & 1;
				bitpos++;
				value>>>=1;
			}
			return bitpos;
		}

		function trailingZeros(i) {
			// From Java 7 Integer.numberOfTrailingZeros(int)
			var y;
			if (i == 0) return 32;
			var n = 31;
			y = i <<16; if (y != 0) { n = n -16; i = y; }
			y = i << 8; if (y != 0) { n = n - 8; i = y; }
			y = i << 4; if (y != 0) { n = n - 4; i = y; }
			y = i << 2; if (y != 0) { n = n - 2; i = y; }
			return n - ((i << 1) >>> 31);
		}

		function log2(n) {
			var b = 0;
			while(n!=0) {
				b++;
				n>>>=1;
			}
			return b;
		}

		function maxVal(numbits) {
			return ~(~0<<numbits);
		}

		/* From https://github.com/darkskyapp/binary-search */
		function binarySearch(haystack, needle, comparator) {
			if(typeof comparator !== "function")
				throw new TypeError("third argument to binary search is not a function");

			var low  = 0,
			mid  = 0,
			high = haystack.length - 1,
			cmp  = 0;

			while(low <= high) {
				/* Note that "(low + high) >>> 1" may overflow, and results in a typecast
				 * to double (which gives the wrong results). */
				mid = low + (high - low >> 1);
				cmp = comparator(haystack[mid], needle)|0;

				/* Too low. */
				if(cmp < 0)
					low  = mid + 1;

				/* Too high. */
				else if(cmp > 0)
					high = mid - 1;

				/* Key found. */
				else
					return mid;
			}

			/* Key not found. */
			return ~low;
		}

		var StopWatch = function () {
		    this.stop=0;
		    this.reset();
		};

		StopWatch.prototype.currentTime = function () {
		    return window.performance.now(); // new Date().getTime();
		};

		StopWatch.prototype.reset = function () {
		    this.start=this.currentTime();
		};

		StopWatch.prototype.stop = function () {
		    this.stop=this.currentTime();
		};

		StopWatch.prototype.stopAndShow = function () {
		    this.stop= this.currentTime();
		    return this.stop-this.start;
		};

		function Bitmap(arg) {
			this.BLOCKS_PER_SUPER = 4;
			if(typeof arg==='number') {
				// Create empty
				this.numbits = arg;
				this.datalen = numBytesFor(arg,1);
				this.datawords = numWordsFor(arg,1);
				this.data = new ByteBuffer(this.datalen, true);
				this.base = 0;
			} else if(arg instanceof ByteBuffer) {
				this.read(arg);
				this.updateIndex();
			}
		}

		Bitmap.prototype.read = function(buffer) {

			var type = buffer.readUint8();
			if(type!=1) {
				throw(new Error("Reading Bitmap but data is not Bitmap."));
			}

			this.numbits = buffer.readVByte();
			buffer.skip(1);

			//console.log("Bitmap: "+this.numbits);

			this.datalen = numBytesFor(this.numbits,1);
			this.datawords = numWordsFor(this.numbits,1);
			this.base = buffer.offset;

			this.data = buffer.slice(buffer.offset, this.datalen);

			buffer.skip(this.datalen+4);
		};

		Bitmap.prototype.access = function(pos) {
			return (this.data.readUint8(this.base+(pos/8)|0) & (1 << (pos%8)))!=0;
		};

		Bitmap.prototype.set = function(pos, value) {
			var oldbyte = this.data.readUint8(this.base+(pos/8)|0);
			var newbyte;
			if(value) {
				newbyte = oldbyte | (1 << (pos%8));
			} else {
				newbyte = oldbyte & ~(1 << (pos%8));
			}

			this.data.writeUint8(newbyte, this.base+(pos/8)|0);
		};

		Bitmap.prototype.getWord = function(word) {
			return this.data.readPartialUint32(this.base+word*4);
		};

		Bitmap.prototype.select1 = function(x) {
			if(x<0) {
				return -1;
			}
			if(x>this.pop) {
				return this.numbits;
			}
			if(this.numbits==0) {
				return 0;
			}

			// Search superblock (binary Search)
			var superBlockIndex = binarySearch(this.superBlocks, x, function(a,b) { return a-b; });
			if(superBlockIndex<0) {
				// Not found exactly, gives the position where it should be inserted
				superBlockIndex = -superBlockIndex-2;
			} else if(superBlockIndex>0){
				// If found exact, we need to check previous block.
				superBlockIndex--;
			}

			// If there is a run of many zeros, two correlative superblocks may have the same value,
			// We need to position at the first of them.
			while(superBlockIndex>0 && (this.superBlocks[superBlockIndex]>=x)) {
				superBlockIndex--;
			}
			var countdown = x-this.superBlocks[superBlockIndex];

			var blockIdx = superBlockIndex * this.BLOCKS_PER_SUPER;

			// Search block
			while(true) {
				if(blockIdx>= (superBlockIndex+1) * this.BLOCKS_PER_SUPER || blockIdx>=this.blocks.length) {
					blockIdx--;
					break;
				}
				if(this.blocks[blockIdx]>=countdown) {
					// We found it!
					blockIdx--;
					break;
				}
				blockIdx++;
			}
			if(blockIdx<0) {
				blockIdx=0;
			}
			countdown = countdown - this.blocks[blockIdx];

			// Search bit inside block
			var bitpos = select1(this.getWord(blockIdx), countdown);

			return blockIdx * 32 + bitpos - 1;
		};

		Bitmap.prototype.selectNext1 = function(fromIndex) {
//				if (fromIndex < 0)
//			        throw new IndexOutOfBoundsException("fromIndex < 0: " + fromIndex);

			var wordIndex = (fromIndex/32)|0;
			if (wordIndex >= this.datawords)
				return -1;

			var word = this.getWord(wordIndex) & (~0 << fromIndex); // CHECK

			while (true) {
				if (word != 0)
					return (wordIndex * 32) + trailingZeros(word);
				if (++wordIndex == this.datawords)
					return -1;
				word = this.getWord(wordIndex);
			}
		};

		Bitmap.prototype.rank1 = function(pos) {
			if(pos<0) {
				return 0;
			}
			if(pos>=this.numbits) {
				return this.pop;
			}

			var superBlockIndex = Math.floor(pos/(this.BLOCKS_PER_SUPER*32));
			var superBlockRank = this.superBlocks[superBlockIndex];

			var blockIndex = Math.floor(pos/32);
			var blockRank = this.blocks[blockIndex];

			var chunkIndex = 32-1-pos%32;
			var block = (this.getWord(blockIndex) << chunkIndex) & 0xFFFFFFFF;
			var chunkRank = bitCount32(block);

			return superBlockRank + blockRank + chunkRank;
		};

		Bitmap.prototype.countOnes = function() {
			return this.pop;
		};

		Bitmap.prototype.updateIndex = function() {
			this.superBlocks = new Uint32Array((1+(this.datawords-1)/this.BLOCKS_PER_SUPER)|0);

			this.blocks = new Uint8Array(this.datawords);

			var countBlock=0, countSuperBlock=0;
			var blockIndex=0, superBlockIndex=0;

			while(blockIndex<this.datawords) {
				if((blockIndex%this.BLOCKS_PER_SUPER)==0) {
					countSuperBlock += countBlock;
					if(superBlockIndex<this.superBlocks.length) {
						this.superBlocks[superBlockIndex++] = countSuperBlock;
					};
					countBlock = 0;
				}
				this.blocks[blockIndex] = countBlock & 0xFF;
				countBlock += bitCount32(this.getWord(blockIndex));
				blockIndex++;
			}
			this.pop = countSuperBlock+countBlock;
		};


		function LogArray(one, two) {
 			if(typeof one==='number' ) {
				if(typeof two==='undefined') {
					two=0;
				}
                                // Create empty
                                this.numentries = two;
                                this.numbits = one;
                                this.datalen = numBytesFor(two,one);
                                this.datawords = numWordsFor(two,one);
                                this.data = new ByteBuffer(this.datalen, true);
                                this.base = 0;
                        } else if(one instanceof ByteBuffer) {
                                this.read(one);
                        }
		};

		LogArray.prototype.read = function(buffer) {
			var type = buffer.readUint8();
			if(type!=1) {
				throw(new Error("Reading LogArray but data is not LogArray."));
			}

			this.numbits = buffer.readUint8();
			this.numentries = buffer.readVByte();
			buffer.skip(1);

			//console.log("LogArray: "+this.numbits+" / "+this.numentries);

			this.numwords = numWordsFor(this.numbits, this.numentries);
			this.databytes = numBytesFor(this.numbits, this.numentries);

			//this.data = new DataView(buffer.array, buffer.offset, this.databytes);
			this.data = buffer.slice(buffer.offset, this.databytes);
			this.base = buffer.offset;

			buffer.skip(this.databytes+4); // + CRC
		};

		LogArray.prototype.getWord = function(word) {
			return this.data.readPartialUint32(this.base+word*4);
		};
		LogArray.prototype.setWord = function(word, value) {
			return this.data.writePartialUint32(this.base+word*4, value);
		};

		LogArray.prototype.get = function(index) {
			if(this.numbits==0) return 0;

			var bitPos = index*this.numbits;
			var i=Math.floor(bitPos / 32);
			var j=bitPos % 32;
			var result;
			if (j+this.numbits <= 32) {
				result = (this.getWord(i) << (32-j-this.numbits)) >>> (32-this.numbits);
			} else {
				result = this.getWord(i) >>> j;
				result = result | (this.getWord(i+1) << ( (32<<1) -j-this.numbits)) >>> (32-this.numbits);
			}
			return result;
		};

		LogArray.prototype.set = function(index, value) {
			if(this.numbits==0) return;

			var bitPos = index*this.numbits;
			var i=(bitPos/32)|0;
			var j=bitPos%32;

			var mask = ~(~0 << this.numbits) << j;
			this.setWord(i, (this.getWord(i) & ~mask) | (value << j));

			if((j+this.numbits>32)) {
				mask = ~0 << (this.numbits+j-32);
				this.setWord(i+1, (this.getWord(i+1) & mask) | value >>> (32-j));
			}
		};

		LogArray.prototype.resizeArray = function (size) {
		};

		LogArray.prototype.resize = function(numentries) {
			this.numentries = numentries;
			this.datawords = numWordsFor(this.numbits, numentries);
			this.databytes = numBytesFor(this.numbits, numentries);
			this.data.resize(4*this.datawords);
		};

		LogArray.prototype.getNumberOfElements = function() {
			return this.numentries;
		};



		/*LogArray.prototype.aggresiveTrimToSize = function() {
			var max = 0;
			// Count and calculate number of bits needed per element.
			for(var i=0; i<this.numentries; i++) {
				var value = this.get(i);
				max = value>max ? value : max;
			}
			var newbits = log2(max);

			if(newbits!=numbits) {
				for(int i=0;i<numentries;i++) {
					var value = getField(data, numbits, i);
					setField(data, newbits, i, value);
				}
				numbits = newbits;
				maxvalue = maxVal(numbits);
				var totalSize = numWordsFor(this.numbits, this.numentries);
				this.resizeArray(totalSize);
			}
		};*/

		LogArray.prototype.trimToSize = function() {
			this.resizeArray(numWordsFor(this.numbits, this.numentries));
		}

		function getRandomInt (min, max) {
		    return Math.floor(Math.random() * (max - min + 1)) + min;
		}

		function ReplazableString() {

			this.text = new ByteBuffer(16*1024);
			this.length = 0;

			this.replace = function(buffer, offset, pos) {
				this.length = pos;
				var totalRead=0;
				while(true) {
					var b= buffer.readByte(offset);
					if(b==0) {
						break;
					}
					this.text.writeByte(b, pos);
					offset++;
					pos++;
					totalRead++;
					this.length++;
				};
				this.text.length = this.length;

				return totalRead;
			};

			this.toString = function() {
				return this.text.readUTF8StringBytes(this.length, 0).string;
			};
		}

		function longestCommonPrefix(str1, str2, from) {
			var len = Math.min(str1.length, str2.length);
			var delta = from;
			while(delta<len && str1.readByte(delta)==str2.readByte(delta)) {
				delta++;
			}
			return delta-from;
		}

		function PFCSection(buffer) {
			var type = buffer.readUint8();
			if(type!=2) {
				throw(new Error("Reading PFC but dictionary section is not PFC."));
			}

			// Read vars
			this.numstrings = buffer.readVByte();
			this.bytes = buffer.readVByte();
			this.blocksize = buffer.readVByte();
			buffer.skip(1);

			//console.log("PFC: "+type+" / "+this.numstrings+" / "+this.bytes+" / "+this.blocksize);

			// Read blocks
			this.blocks = new LogArray(buffer);

			this.data = buffer.slice(buffer.array, buffer.offset, this.bytes);
			this.base = buffer.offset;


			// Skip data
			buffer.offset += this.bytes+4;  // +CRC

			this.getNumberOfElements = function() {
				return this.numstrings;
			};

			this.getStr = function(pos) {
				return this.data.readUTF8StringNull(pos).string;
			};

			var strcmp = function(a,b) {
				if(a==b) {
					return 0;
				} else if(a<b) {
					return -1;
				} else {
					return 1;
				}
			};

			this.locateBlock = function(str) {
				// FIXME: Adapt existing binary search.
				if(this.blocks.getNumberOfElements()==0) {
					return -1;
				}

				var low = 0;
				var high = this.blocks.getNumberOfElements()-1;
				var max = high;

				while (low <= high) {
					var mid = (low + high) >>> 1;

					var cmp;
					if(mid==max) {
						cmp = -1;
					} else {
						var pos = this.blocks.get(mid);
						var curStr = this.getStr(this.base+pos);

						// FIXME: Compare ByteBuffers instead of Strings
						cmp = strcmp(str, curStr);
						//console.log("Comparing against block: "+ mid + " which is "+ curStr+ " Result: "+cmp);
					}

					if (cmp<0) {
						high = mid - 1;
					} else if (cmp > 0) {
						low = mid + 1;
					} else {
						return mid; // key found
					}
				}
				return -(low + 1);  // key not found.
			};

			var toByteBuffer=function(str) {
				var buffer = ByteBuffer.allocate(128);
				var size = buffer.writeUTF8String(str,0);
				buffer.length = size;
				return buffer;
			};

			this.locate = function(str) {
				if(!this.data || !this.blocks) {
					return 0;
				}

				//str = toByteBuffer(str);

				var blocknum = this.locateBlock(str);
				if(blocknum>=0) {
					// Located exactly
					return (blocknum*this.blocksize)+1;
				} else {
					// Not located exactly.
					blocknum = -blocknum-2;

					if(blocknum>=0) {
						var idblock = this.locateInBlock(blocknum, toByteBuffer(str));

						if(idblock != 0) {
							return (blocknum*this.blocksize)+idblock+1;
						};
					};
				}

				return 0;
			};

			this.locateInBlock=function(block,str) {

				if(block>=this.blocks.getNumberOfElements()) {
					return 0;
				}

				var offset = this.blocks.get(block);

				var delta;
				var idInBlock = 0;
				var cshared=0;

				// Read the first string in the block
				var tempString = new ReplazableString();
				offset += tempString.replace(this.data, this.base+offset, 0)+1;
				var ret={};

				idInBlock++;

				while( (idInBlock<this.blocksize) && (offset<this.bytes))
				{
					// Decode prefix

					this.data.readVByte(this.base+offset, ret);
					var delta = ret.value;
					offset+=ret.numbytes;

					//Copy suffix
					offset+=tempString.replace(this.data, this.base+offset, delta)+1;

					if(delta>=cshared)
					{
						// Current delta value means that this string
						// has a larger long common prefix than the previous one
						cshared += longestCommonPrefix(tempString.text, str, cshared);

						if((cshared==str.length) && (tempString.length==str.length)) {
							return idInBlock;
						}
					} else {
						// We have less common characters than before,
						// this string is bigger that what we are looking for.
						// i.e. Not found.
						idInBlock = 0;
						break;
					}
					idInBlock++;

				}

				if(offset>=this.bytes || idInBlock==this.blocksize) {
					idInBlock=0;
				}

				return idInBlock;
			};

			this.extract = function(id) {
				if(!this.data || !this.blocks) {
					return null;
				}

				if(id<1 || id>this.numstrings) {
					return null;
				}

				var block = ((id-1)/this.blocksize)|0;
				var stringid = (id-1)%this.blocksize;
				var offset = this.blocks.get(block);

				var tempString = new ReplazableString();
				offset += tempString.replace(this.data, this.base+offset, 0)+1;
				var ret={};

				for(var i=0;i<stringid;i++) {
					// Read delta
					this.data.readVByte(this.base+offset, ret);
					var delta = ret.value;
					offset+=ret.numbytes;

					// Copy suffix
					offset+=tempString.replace(this.data, this.base+offset, delta)+1;
				}
				return tempString.toString();
			};


			this.getSuggestions = function(prefix, maxnum, arr) {

				if(!this.data || !this.blocks) {
					return null;
				}

//				if(typeof arr !== 'array') {
//					return;
//				}

				var block = this.locateBlock(prefix);
				if(block<0) {
					block = -block-2;
				}

				if(block<0) {
					block=0;
					//return arr;
				}

				var offset = this.blocks.get(block);
				var stringid = this.blocksize*block;
				var tempString = new ReplazableString();
				var numfound=0;

				while(stringid<this.numstrings && block<this.blocks.getNumberOfElements()) {
					if((stringid%this.blocksize)==0) {
						offset += tempString.replace(this.data, this.base+offset, 0)+1;
					} else {
						var ret={};

						// Read delta
						this.data.readVByte(this.base+offset, ret);
						var delta = ret.value;
						offset+=ret.numbytes;

						// Copy suffix
						offset+=tempString.replace(this.data, this.base+offset, delta)+1;
					}

					var asStr = tempString.toString();
					var subStr = asStr.substring(0, prefix.length);

					if(subStr==prefix) {
						numfound++;
						arr.push(asStr);
					}
					if(subStr>prefix || numfound>=maxnum) {
						break;
					}
					stringid++;
				}

				return arr;
			};

		}

		function Header(buffer) {
			var control = new ControlInfo(buffer);

			if(control.type!==HDT.ControlInfoType.HEADER) {
				throw(new Error("Reading Header but section is not Header."));
			}
			this.format = control.format;

			var len = parseInt(control.properties["length"]);
			this.content = buffer.readUTF8StringBytes(len);

			//console.log(this.content);
		}

		function Dictionary(buffer) {
			var control = new ControlInfo(buffer);

			if(control.type!==HDT.ControlInfoType.DICTIONARY) {
				throw(new Error("Reading Dictionary but section is not dictionary."));
			}
			this.format = control.format;

			this.shared = new PFCSection(buffer);
			this.subjects = new PFCSection(buffer);
			this.predicates = new PFCSection(buffer);
			this.objects = new PFCSection(buffer);

			this.getGlobalId = function(id, role) {
				switch (role) {
				case HDT.DictionarySectionRole.SUBJECT:
				case HDT.DictionarySectionRole.OBJECT:
					return this.shared.getNumberOfElements()+id;

				case HDT.DictionarySectionRole.PREDICATE:
				case HDT.DictionarySectionRole.SHARED:
					return id;
				}

				// ERROR: throw new IllegalArgumentException();

			};

			this.getLocalId = function(id, position) {
				switch (position) {
				case HDT.DictionarySectionRole.SUBJECT:
				case HDT.DictionarySectionRole.OBJECT:
					if(id<=this.shared.getNumberOfElements()) {
						return id;
					} else {
						return id-this.shared.getNumberOfElements();
					}
				case HDT.DictionarySectionRole.PREDICATE:
					return id;
				}

				// ERROR: throw new IllegalArgumentException();
			};

			this.getSection = function(id, role) {
				switch (role) {
				case HDT.DictionarySectionRole.SUBJECT:
					if(id<=this.shared.getNumberOfElements()) {
						return this.shared;
					} else {
						return this.subjects;
					}
				case HDT.DictionarySectionRole.PREDICATE:
					return this.predicates;
				case HDT.DictionarySectionRole.OBJECT:
					if(id<=this.shared.getNumberOfElements()) {
						return this.shared;
					} else {
						return this.objects;
					}
				}
				// ERROR throw new IllegalArgumentException();
			};

			this.stringToId = function(str, position) {

				if(!str || str.length==0) {
					return 0;
				}

				var ret=0;
				switch(position) {
				case HDT.DictionarySectionRole.SUBJECT:
					ret = this.shared.locate(str);
					if(ret!=0) {
						return this.getGlobalId(ret, HDT.DictionarySectionRole.SHARED);
					}
					ret = this.subjects.locate(str);
					if(ret!=0) {
						return this.getGlobalId(ret, HDT.DictionarySectionRole.SUBJECT);
					}
					return -1;
				case HDT.DictionarySectionRole.PREDICATE:
					ret = this.predicates.locate(str);
					if(ret!=0) {
						return this.getGlobalId(ret, HDT.DictionarySectionRole.PREDICATE);
					}
					return -1;
				case HDT.DictionarySectionRole.OBJECT:
					if(str.charAt(0)!='"') {
						ret = this.shared.locate(str);
						if(ret!=0) {
							return this.getGlobalId(ret, HDT.DictionarySectionRole.SHARED);
						}
					}
					ret = this.objects.locate(str);
					if(ret!=0) {
						return this.getGlobalId(ret, HDT.DictionarySectionRole.OBJECT);
					}
					return -1;
				}
				// ERROR
			};

			this.idToString = function(id,role) {
				var section = this.getSection(id, role);
				var localId = this.getLocalId(id, role);
				return section.extract(localId);
			};

			this.getSuggestions = function(role, prefix, maxnum) {
				var res = [];
				switch(role) {
				case HDT.DictionarySectionRole.SUBJECT:
					res = this.shared.getSuggestions(prefix,maxnum, res);
					return this.subjects.getSuggestions(prefix,maxnum, res);
				case HDT.DictionarySectionRole.PREDICATE:
					return this.predicates.getSuggestions(prefix,maxnum, res);
				case HDT.DictionarySectionRole.OBJECT:
					res = this.shared.getSuggestions(prefix,maxnum, res);
					if(prefix.charAt(0)!='"' && prefix.indexOf("http")!=0 && prefix.indexOf("file")!=0) {
						prefix =  '"'+prefix;
					}
					return this.objects.getSuggestions(prefix,maxnum, res);
				}

				return res;
			};

			this.getNumberOfElements = function() {
				return this.shared.getNumberOfElements()+this.subjects.getNumberOfElements()+this.predicates.getNumberOfElements()+this.objects.getNumberOfElements();
			};

			this.getNsubjects = function() {
				return this.shared.getNumberOfElements()+this.subjects.getNumberOfElements();
			};
			this.getNobjects = function() {
				return this.shared.getNumberOfElements()+this.objects.getNumberOfElements();
			};
			this.getNshared = function() {
				return this.shared.getNumberOfElements();
			};
			this.getNpredicates = function() {
				return this.predicates.getNumberOfElements();
			};
		}

		function AdjacencyList(array, bitmap) {
			this.array = array;
			this.bitmap = bitmap;

			this.getNumberOfElements = function() {
				return this.array.getNumberOfElements();
			};

			this.get = function(i) {
				return this.array.get(i);
			};

			this.findListIndex=function(globalpos) {
				return this.bitmap.rank1(globalpos-1);
			};

			this.find=function(x) {
				return x<=0 ? 0 : this.bitmap.select1(x)+1;
			};

			this.find2=function(x,y) {
				// Find first and last element of the list.
				var begin = this.find(x);
				var end = this.last(x);
				// Binary search y within the list
				return this.binSearch(y, begin, end);
			};

			this.last=function(x) {
				return bitmap.select1(x+1);
			};

			this.binSearch=function(element, begin, end) {
				while(begin<=end) {
					var mid = (begin+end)>>>1;
					var read = this.array.get(mid);
					if(element>read) {
						begin = mid+1;
					} else if(element<read) {
						end = mid-1;
					} else {
						return mid;
					}
				}
				throw "Not found";
			};

			this.findListIndex=function(globalpos) {
				return bitmap.rank1(globalpos-1);
			};

			this.findNext=function(pos) {
				return bitmap.selectNext1(pos);
			};

		};

		function itEach(it, callback) {
			while(it.hasNext()) {
				callback(it.next());
			}
		}

		function FilterIterator(it,s,p,o) {
			this.it = it;
			this.s = s;
			this.p = p;
			this.o = o;

			this.doFetchNext = function() {
				this.nextTriple = undefined;

				while(this.it.hasNext()) {
					var next = this.it.next();

					if (s == 0 || next.subject == s) {
						if (p == 0 || next.predicate == p) {
							if (o == 0 || next.object == o) {
								this.nextTriple=next;
								break;
							}
						}
					}
				}
			};

			this.hasNext = function() {
				return this.nextTriple !== undefined;
			};

			this.next = function() {
				var t = this.nextTriple;
				this.doFetchNext();
				return t;
			};

			this.numResults=function() {
				return this.it.numResults();
			};

			this.each = function(callback) {
				return itEach(this,callback);
			};

			this.doFetchNext();
		}

		function NullIterator() {
			this.hasNext = function() {
				return false;
			};

			this.next = function() {
				return undefined;
			};

			this.numResults = function() {
				return 0;
			};

			this.each = function(callback) {
			};
		}

		function BitmapTriplesIterator(triples, s, p, o) {
			this.triples = triples;
			this.patX = s; this.patY=p; this.patZ=o;

			this.adjY = new AdjacencyList(triples.arrayY, triples.bitmapY);
			this.adjZ = new AdjacencyList(triples.arrayZ, triples.bitmapZ);

			this.findRange = function() {
				if(this.patX!=0) {
					// S X X
					if(this.patY!=0) {
						// S P X
						try {
							this.minY = this.adjY.find2(this.patX-1, this.patY);
							this.maxY = this.minY+1;
							if(this.patZ!=0) {
								// S P O
								this.minZ = this.adjZ.find2(this.minY,this.patZ);
								this.maxZ = this.minZ+1;
							} else {
								// S P ?
								this.minZ = this.adjZ.find(this.minY);
								this.maxZ = this.adjZ.last(this.minY)+1;
							}
						} catch (e) {
							// Item not found in list, no results.
							this.minY = this.minZ = this.maxY = this.maxZ = 0;
						}
					} else {
						// S ? X
						this.minY = this.adjY.find(this.patX-1);
						this.minZ = this.adjZ.find(this.minY);
						this.maxY = this.adjY.last(this.patX-1)+1;
						this.maxZ = this.adjZ.find(this.maxY);
					}
					this.x = this.patX;
				} else {
					// ? X X
					this.minY=0;
					this.minZ=0;
					this.maxY = this.adjY.getNumberOfElements();
					this.maxZ = this.adjZ.getNumberOfElements();
				}
			};

			this.goToStart = function() {
				this.posZ = this.minZ;
				this.posY = this.adjZ.findListIndex(this.posZ);

				this.z = this.adjZ.get(this.posZ);
				this.y = this.adjY.get(this.posY);
				this.x = this.adjY.findListIndex(this.posY)+1;

				this.nextY = this.adjY.last(this.x-1)+1;
				this.nextZ = this.adjZ.last(this.posY)+1;
			};

			this.hasNext = function() {
				return (this.posZ<this.maxZ);
			};

			this.next = function() {
				this.z = this.adjZ.get(this.posZ);
				if(this.posZ==this.nextZ) {
					this.posY++;
					this.y = this.adjY.get(this.posY);
//					this.nextZ = this.adjZ.find(this.posY+1);
					this.nextZ = this.adjZ.findNext(this.nextZ)+1;

					if(this.posY==this.nextY) {
						this.x++;
//						this.nextY = this.adjY.find(this.x);
						this.nextY = this.adjY.findNext(this.nextY)+1;
					};
				}

				var ret = {};
				ret.subject = this.x;
				ret.predicate = this.y;
				ret.object = this.z;
				ret.posZ = this.posZ;

				this.posZ++;

				return ret;
			};

			this.numResults = function() {
				return this.maxZ-this.minZ;
			};

			this.each = function(callback) {
				return itEach(this,callback);
			};

			this.findRange();
			this.goToStart();
		}

		function BitmapTriplesIteratorY(triples, s, p, o) {
			this.triples=triples;
			this.patY = p;
			this.adjY = new AdjacencyList(triples.arrayY, triples.bitmapY);
			this.adjZ = new AdjacencyList(triples.arrayZ, triples.bitmapZ);
			this.bitmap = triples.bitmapPredicate;
			this.array = triples.arrayPredicate;

			this.numOccurrences = this.bitmap.select1(p)-this.bitmap.select1(p-1);
			this.maxZ=triples.getNumberOfElements();

			this.calculatePos=function(pred){
				if(pred<=1) {
					return 0;
				}
				return this.bitmap.select1(pred-1)+1;
			};

			this.getOccurrence=function(pred, occ) {
				return this.array.get(this.calculatePos(pred)+occ-1);
			};

			this.hasNext = function() {
				return this.posZ<this.maxZ && (this.numOccurrence<this.numOccurrences) || this.posZ<=this.nextZ;
			};
			this.next = function() {
				if(this.posZ>this.nextZ) {
					this.numOccurrence++;
					this.posY = this.getOccurrence(this.patY, this.numOccurrence);

					this.posZ = this.adjZ.find(this.posY);
					this.nextZ = this.adjZ.last(this.posY);

					this.x = this.adjY.findListIndex(this.posY)+1;
					this.y = this.adjY.get(this.posY);
					this.z = this.adjZ.get(this.posZ);
				} else {
					this.z = this.adjZ.get(this.posZ);
				}

				var ret = {};
				ret.subject = this.x;
				ret.predicate = this.y;
				ret.object = this.z;
				ret.posZ = this.posZ;

				this.posZ++;

				return ret;
			};

			this.numResults = function() {
				return this.triples.predicateCount.get(this.patY-1);
			};

			this.goToStart = function() {
				this.numOccurrence = 1;
				this.posY = this.getOccurrence(this.patY, this.numOccurrence);

				this.posZ = this.prevZ = this.adjZ.find(this.posY);
				this.nextZ = this.adjZ.last(this.posY);

				this.x = this.adjY.findListIndex(this.posY)+1;
				this.y = this.adjY.get(this.posY);
		        this.z = this.adjZ.get(this.posZ);
			};

			this.each = function(callback) {
				return itEach(this,callback);
			};

			this.goToStart();
		};

		function BitmapTriplesIteratorZ(triples, s, p, o) {

			if(typeof triples.arrayIndex==='undefined') {
				throw new Error("Index not loaded.");
			}

			this.triples = triples;
			this.patY = p;
			this.patZ = o;
			this.adjY = new AdjacencyList(triples.arrayY, triples.bitmapY);
			this.adjZ = new AdjacencyList(triples.arrayZ, triples.bitmapZ);
			this.adjIndex=new AdjacencyList(triples.arrayIndex, triples.bitmapIndex);

			this.getY=function(index) {
				return this.adjY.get(this.adjIndex.get(index));
			};

			this.calculateRange=function() {
				this.minIndex = this.adjIndex.find(this.patZ-1);
				this.maxIndex = this.adjIndex.last(this.patZ-1);

				if(this.patY!=0) {
					while (this.minIndex <= this.maxIndex) {
						var mid = (this.minIndex + this.maxIndex) >>> 1;
						var predicate=this.getY(mid);

						if (this.patY > predicate) {
							this.minIndex = mid + 1;
						} else if (this.patY < predicate) {
							this.maxIndex = mid - 1;
						} else {
							// Binary Search to find left boundary
							var left=this.minIndex;
							var right=mid;
							var pos=0;

							while(left<=right) {
								pos = (left+right)>>>1;

								predicate = this.getY(pos);

								if(predicate!=this.patY) {
									left = pos+1;
								} else {
									right = pos-1;
								}
							}
							this.minIndex = predicate==this.patY ? pos : pos+1;

							// Binary Search to find right boundary
							left = mid;
							right= this.maxIndex;

							while(left<=right) {
								pos = (left+right)>>>1;
								predicate = this.getY(pos);

								if(predicate!=this.patY) {
									right = pos-1;
								} else {
									left = pos+1;
								}
							}
							this.maxIndex = predicate==this.patY ? pos : pos-1;

							break;
						}
					}
				}
			};

			this.goToStart=function() {
				this.posIndex = this.minIndex;
			};

			this.hasNext = function() {
				return this.posIndex<=this.maxIndex;
			};

			this.next = function() {

			    var posY = this.adjIndex.get(this.posIndex);

			    var ret = {};
			    ret.subject = this.adjY.findListIndex(posY)+1;
			    ret.predicate = this.patY!=0 ? this.patY : this.adjY.get(posY);
			    ret.object = this.patZ;
			    //if(this.triples.bitmapDeleted) {
			    	ret.posZ = this.adjZ.find2(posY, this.patZ);
			    //}

			    this.posIndex++;

			    return ret;
			};

			this.numResults = function() {
				return this.maxIndex-this.minIndex+1;
			};

			this.each = function(callback) {
				return itEach(this,callback);
			};

			this.calculateRange();
			this.goToStart();
		};

		function IteratorRemove(triples, iterator) {
			this.triples = triples;
			this.it = iterator;

			this.hasNext=function() {
				while(this.it.hasNext()){
					this.elem = this.it.next();
					if(!this.triples.bitmapDeleted.access(this.elem.posZ)) {
						return true;
					}
				}
				return false;
			};

			this.next = function() {
				return this.elem;
			};

			this.remove = function() {
				this.triples.bitmapDeleted.set(this.elem.posZ, true);
			};

			this.numResults = function() {
				return this.it.numResults();
			};
		};

		function Triples(buffer) {
			var control = new ControlInfo(buffer);

			if(control.type!==HDT.ControlInfoType.TRIPLES) {
				throw(new Error("Reading Triples but section is not triples."));
			}
			this.format = control.format;

			this.bitmapY = new Bitmap(buffer);
			this.bitmapZ = new Bitmap(buffer);
			this.arrayY = new LogArray(buffer);
			this.arrayZ = new LogArray(buffer);

			this.getNumberOfElements = function() {
				return this.arrayZ.numentries;
			};

			this.search = function(s,p,o) {
				var retit;
				s = s ? s : 0;
				p = p ? p : 0;
				o = o ? o : 0;

				if(!s && p && !o) {
					if(typeof this.arrayPredicate !== 'undefined') {
						retit = new BitmapTriplesIteratorY(this,s,p,o);
					} else {
						retit = new FilterIterator(new BitmapTriplesIterator(this,s,p,o),s,p,o);
					}
				} else if(!s && o) {
					if(typeof this.arrayIndex !== 'undefined') {
						retit = new BitmapTriplesIteratorZ(this,s,p,o);
					} else {
						retit = new FilterIterator(new BitmapTriplesIterator(this,s,p,o),s,p,o);
					}
				} else {
					retit = new BitmapTriplesIterator(this,s,p,o);
					if(p==0 && o!==0) {
						retit = new FilterIterator(retit,s,p,o);
					}
				};

				if(typeof this.bitmapDeleted !=='undefined') {
					retit = new IteratorRemove(this, retit);
				}
				return retit;
			};

			this.makeRemovable = function() {
				if(typeof this.bitmapDeleted==='undefined') {
					this.bitmapDeleted = new Bitmap(this.bitmapZ.numbits);
				}
			};


			this.generateIndex = function() {
				var seqY = this.arrayY;
				var seqZ = this.arrayZ;

				var st = new StopWatch();
				var global = new StopWatch();

				// Count the number of appearances of each object
				var maxCount = 0;
				var numDifferentObjects = 0;
				var numReservedObjects = 8192;
				var objectCount = new LogArray(log2(seqZ.getNumberOfElements()), numReservedObjects);
				for(var i=0;i<seqZ.getNumberOfElements(); i++) {
					var val = seqZ.get(i);
					if(val==0) {
						throw new Error("ERROR: There is a zero value in the Z level.");
					}
					if(numReservedObjects<val) {
						while(numReservedObjects<val) {
							numReservedObjects <<=1;
						}
						objectCount.resize(numReservedObjects);
					}
					if(numDifferentObjects<val) {
						numDifferentObjects=val;
					}

					var count = objectCount.get(val-1)+1;
					maxCount = count>maxCount ? count : maxCount;
					objectCount.set(val-1, count);
				}
				console.log("Count Objects in " + st.stopAndShow() + " Max was: " + maxCount);
				st.reset();

				// Calculate bitmap that separates each object sublist.
				var bitmapIndex = new Bitmap(seqZ.getNumberOfElements());
				var tmpCount=0;
				for(var i=0;i<numDifferentObjects;i++) {
					tmpCount += objectCount.get(i);
					bitmapIndex.set(tmpCount-1, true);
				}
				bitmapIndex.set(seqZ.getNumberOfElements()-1, true);
				bitmapIndex.updateIndex();
				console.log("Bitmap in " + st.stopAndShow());
				objectCount=null;
				st.reset();

				// Copy each object reference to its position
				var objectInsertedCount = new LogArray(log2(maxCount), numDifferentObjects);
				objectInsertedCount.resize(numDifferentObjects);

				var objectArray = new LogArray(log2(seqY.getNumberOfElements()), seqZ.getNumberOfElements()*2);
				objectArray.resize(seqZ.getNumberOfElements());

				for(var i=0;i<seqZ.getNumberOfElements(); i++) {
					var objectValue = seqZ.get(i);
					var posY = i>0 ?  this.bitmapZ.rank1(i-1) : 0;

					var insertBase = objectValue==1 ? 0 : bitmapIndex.select1(objectValue-1)+1;
					var insertOffset = objectInsertedCount.get(objectValue-1);
					objectInsertedCount.set(objectValue-1, insertOffset+1);

					objectArray.set(insertBase+insertOffset, posY);
				}
				console.log("Object references in " + st.stopAndShow());
				objectInsertedCount=null;
				st.reset();

				var object=1;
				var first = 0;
				var last = bitmapIndex.select1(object)+1;
				do {
					var listLen = last-first;

					// Sublists of one element do not need to be sorted.

					// Hard-coded size-2 for speed (They are quite common).
					if(listLen==2) {
						var aPos = objectArray.get(first);
						var a = seqY.get(aPos);
						var bPos = objectArray.get(first+1);
						var b = seqY.get(bPos);
						if(a>b) {
							objectArray.set(first, bPos);
							objectArray.set(first+1, aPos);
						}
					} else if(listLen>2) {
						var list=[];

						// Create temporary list of (position, predicate)
						for(var i=first; i<last;i++) {
							var p = {};
							p.positionY=objectArray.get(i);
							p.valueY=seqY.get(p.positionY);
							list.push(p);
						}

						// Sort
						list.sort(
							function(o1,o2) {
								if(o1.valueY==o2.valueY) {
									return o1.positionY-o2.positionY;
								}
								return o1.valueY-o2.valueY;
							}
						);

						// Copy back
						for(var i=first; i<last;i++) {
							objectArray.set(i, list[i-first].positionY);
						}
					}

					first = last;
					last = bitmapIndex.select1(object)+1;
					object++;
				} while(object<=numDifferentObjects);

				console.log("Sort object sublists in "+st.stopAndShow());
				st.reset();

				// Count predicates
				var predCount = new LogArray(log2(seqY.getNumberOfElements()));
				for(var i=0;i<seqY.getNumberOfElements(); i++) {
					// Read value
					var val = seqY.get(i);

					// Grow if necessary
					if(predCount.getNumberOfElements()<val) {
						predCount.resize(val);
					}

					// Increment
					predCount.set(val-1, predCount.get(val-1)+1);
				}
				predCount.trimToSize();
				console.log("Count predicates in "+st.stopAndShow());
				this.predicateCount = predCount;
				st.reset();

				// Save Object Index
				this.arrayIndex = objectArray;
				this.bitmapIndex = bitmapIndex;


				// Index predicates
				var st = new StopWatch();
				var predCount = new LogArray(log2(seqY.getNumberOfElements()));

				    var maxCount = 0;
				    for(var i=0;i<seqY.getNumberOfElements(); i++) {
					// Read value
					var val = seqY.get(i);

					// Grow if necessary
					if(predCount.getNumberOfElements()<val) {
					    predCount.resize(val);
					}

					// Increment
					var count = predCount.get(val-1)+1;
					maxCount = count>maxCount ? count : maxCount;
					predCount.set(val-1, count);

					//ListenerUtil.notifyCond(iListener,  "Counting appearances of predicates", i, seqY.getNumberOfElements(), 20000);
				    }
				    //predCount.aggresiveTrimToSize();
				    predCount.trimToSize();

				    // Convert predicate count to bitmap
				    var bitmap = new Bitmap(seqY.getNumberOfElements());
				    var tempCountPred=0;
				    for(var i=0;i<predCount.getNumberOfElements();i++) {
					tempCountPred += predCount.get(i);
					bitmap.set(tempCountPred-1,true);
					//ListenerUtil.notifyCond(iListener, "Creating Predicate bitmap", i, predCount.getNumberOfElements(), 100000);
				    }
				    bitmap.set(seqY.getNumberOfElements()-1, true);
				    bitmap.updateIndex();
				    console.log("Predicate Bitmap in " + st.stopAndShow());
				    st.reset();

				    predCount=null;


				    // Create predicate index
				    var array = new LogArray(log2(seqY.getNumberOfElements()), seqY.getNumberOfElements());
				    array.resize(seqY.getNumberOfElements());

				    var insertArray = new LogArray(log2(seqY.getNumberOfElements()), bitmap.countOnes());
				    insertArray.resize(bitmap.countOnes());

				    for(var i=0;i<seqY.getNumberOfElements(); i++) {
					    var predicateValue = seqY.get(i);

					    var insertBase = predicateValue==1 ? 0 : bitmap.select1(predicateValue-1)+1;
					    var insertOffset = insertArray.get(predicateValue-1);
					    insertArray.set(predicateValue-1, insertOffset+1);

					    array.set(insertBase+insertOffset, i);

					    //ListenerUtil.notifyCond(iListener,  "Generating predicate references", i, seqY.getNumberOfElements(), 100000);
				    }

				    this.arrayPredicate = array;
				    this.bitmapPredicate = bitmap;
				    console.log("Predicate Index in "+st.stopAndShow());
				console.log("Index generated in "+global.stopAndShow());

			};
		}

		function DictionaryTranslateIterator(dict, it) {
			this.dict = dict;
			this.it = it;
			this.lastId = {};
			this.lastStr = {};

			this.hasNext=function() {
				return this.it.hasNext();
			};

			this.next=function() {
				var triple = it.next();

				triple.subject = this.lastId.subject==triple.subject ? this.lastStr.subject : (this.lastStr.subject = this.dict.idToString(triple.subject, HDT.DictionarySectionRole.SUBJECT));
				triple.predicate = this.lastId.predicate == triple.predicate ? this.lastStr.predicate : (this.lastStr.predicate = this.dict.idToString(triple.predicate, HDT.DictionarySectionRole.PREDICATE));
				triple.object = this.lastId.object == triple.object ? this.lastStr.object : (this.lastStr.object = this.dict.idToString(triple.object, HDT.DictionarySectionRole.OBJECT));

				this.lastId = triple;

				return triple;
			};

			this.numResults=function() {
				return this.it.numResults();
			};

			this.each = function(callback) {
				return itEach(this,callback);
			};

			this.remove = function() {
				return this.it.remove();
			};
		}


		function HDT() {
			this.array = null;
			this.header = null;
			this.dictionary = null;
			this.triples = null;
		}

		HDT.prototype.readURL = function(url, callback, readIndex,progress) {
			var xhr = new XMLHttpRequest();

			if(typeof progress == 'function') {
				xhr.addEventListener("progress", function(e) {
					e.message="Downloading HDT";
					progress(e);
				}, false);
			}
			xhr.open('GET', url, true);

			xhr.responseType = 'arraybuffer';

			var obj = this;

			xhr.onload = function(e) {
				if (this.status == 200) {
					obj.source=url;
					obj.sourcetype="url";
					obj.array=this.response;
					obj.decode();
					if(readIndex) {
						obj.readIndexURL(callback, callback, progress);
					} else {
						callback(obj);
					}
				} else {
					alert("Error on XMLHttpRequest: "+e.target.status);
				}
			};

			xhr.onerror = function(e) {
				//console.dir(e);
			};


			xhr.send();
		};

		HDT.prototype.readIndexURL = function(callback, error, progress) {
			var xhr = new XMLHttpRequest();

			if(typeof progress == 'function') {
				xhr.addEventListener("progress", function(e) {
					e.message="Downloading HDT.index";
					progress(e);
				}, false);
			}

			xhr.open('GET', this.source+".index", true);

			xhr.responseType = 'arraybuffer';

			var obj = this;

			xhr.onload = function(e) {
				if (this.status == 200) {
					obj.arrayindex=this.response;
					obj.decodeIndex();
				} else {
					obj.generateIndex();
				}
				callback(obj);
			};

			xhr.onerror = function(e) {
				obj.generateIndex();
				callback(obj);
			};

			xhr.send();
		};

		HDT.prototype.readFile = function(file, callback, readIndex) {
			var reader = new FileReader();

			var obj = this;

			reader.onload = function(event) {
				obj.source = file;
				obj.sourcetype="file";
				obj.array = reader.result;
				obj.decode();

				if(readIndex) {
					obj.readIndexFile(callback, callback);
				} else {
					callback(obj);
				}
			};

			reader.onerror = function(event) {
				alert("File could not be read! Code " + event.target.error.code);
			};

			reader.readAsArrayBuffer(file);
		};

		HDT.prototype.generateIndex = function() {
			this.triples.generateIndex();
		}

		HDT.prototype.readIndexFile = function(callback, error) {
			var reader = new FileReader();

			var obj = this;

			reader.onload = function(event) {
				obj.arrayindex=reader.result;
				obj.decodeIndex();
				callback(obj);
			};

			reader.onerror = function(event) {
				console.log(event);
				callback(obj);
			};

			var indexFile = {};
			indexFile.name = this.source.name+".index";
			indexFile.path = this.source.path+".index";

			reader.readAsArrayBuffer(indexFile);
		};

		HDT.prototype.decode = function() {

			var byteB = ByteBuffer.wrap(this.array, "utf8", true);

			var globalControl = new ControlInfo(byteB);

			if(globalControl.type!==HDT.ControlInfoType.GLOBAL) {
				throw(new Error("ControlInformation is not global"));
			}

			if(globalControl.format!==HDT.HDTv1) {
				throw(new Error("This version can only load files HDT version 1"));
			}

			this.header=new Header(byteB);
			this.dictionary=new Dictionary(byteB);
			this.triples=new Triples(byteB);

		};

		HDT.prototype.decodeIndex = function() {
			var byteB = ByteBuffer.wrap(this.arrayindex, "utf8", true);

			var control = new ControlInfo(byteB);

			if(control.type!==HDT.ControlInfoType.INDEX) {
				throw(new Error("ControlInformation is not index"));
			}

//			if(control.format!==HDT.HDTv1) {
//				throw(new Error("This version can only load files HDT version 1"));
//			}

			this.triples.predicateCount = new LogArray(byteB);
			this.triples.bitmapIndex = new Bitmap(byteB);
			this.triples.arrayIndex = new LogArray(byteB);

			this.triples.bitmapPredicate = new Bitmap(byteB);
			this.triples.arrayPredicate = new LogArray(byteB);

		};

		/**
		 * Searches all triples that match the supplied pattern (s,p,o)
		 * Undefined or empty terms are considered wildcards.
		 *
		 */
		HDT.prototype.search = function(s,p,o) {
			s = this.dictionary.stringToId(s, HDT.DictionarySectionRole.SUBJECT);
			p = this.dictionary.stringToId(p, HDT.DictionarySectionRole.PREDICATE);
			o = this.dictionary.stringToId(o, HDT.DictionarySectionRole.OBJECT);

			if(s===-1 || p===-1 || o===-1) {
				return new NullIterator();
			}

			return new DictionaryTranslateIterator(this.dictionary, this.triples.search(s,p,o));
		};

		/**
		 * Removes all the triples from the HDT that match (s,p,o), Returns the number of removed.
		 * @param s
		 * @param p
		 * @param o
		 * @return
		 */
		HDT.prototype.remove = function(s,p,o) {
			var count = 0;

			var it = hdt.search(s, p, o).it;

			while(it.hasNext()) {
				var t = it.next();
				it.remove();
				count++;
			}

			return count;
		};

		return HDT;
	}

	// Enable module loading if available
	if (typeof module !== 'undefined' && module["exports"]) { // CommonJS
		module["exports"] = loadHDT(require("bytebuffer"), require("FileReader"));
	} else if (typeof define !== 'undefined' && define["amd"]) { // AMD
		define("HDT", ["ByteBuffer"], function() { return loadHDT(ByteBuffer); });
	} else { // Shim
		global["HDT"] = loadHDT(global["dcodeIO"]["ByteBuffer"], global["FileReader"]);
	}

})(this);